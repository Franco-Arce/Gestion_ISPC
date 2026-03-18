"""
ISPC Campus Scraper
Extrae datos del campus virtual ISPC y guarda en public/data/ispc_data.json
Corre via GitHub Actions diariamente o manualmente.
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = "https://acceso.ispc.edu.ar"
OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data" / "ispc_data.json"

MATERIAS_2026 = {
    "TSDS": [
        {"nombre": "Programación III", "horario": "Martes 18:20–20:40", "comision": "Única"},
        {"nombre": "Interfaz de Usuario", "horario": "Martes 18:20–20:40", "comision": "Única"},
        {"nombre": "Práctica Profesionalizante II", "horario": "Miércoles 18:20–19:20", "comision": "Única"},
        {"nombre": "Ciencia de Datos", "horario": "Miércoles 19:40–20:40", "comision": "Única"},
        {"nombre": "Ingeniería de Software", "horario": "Jueves 18:20–19:20", "comision": "Única"},
        {"nombre": "Gestión de Proyectos", "horario": "Jueves 19:40–20:40", "comision": "Única"},
    ],
    "TSCDIA": [
        {"nombre": "Estadística y Exploración de Datos I", "horario": "Martes 15:40–18:00", "comision": "A (tarde)"},
        {"nombre": "Procesamiento de Datos", "horario": "Martes 15:40–18:00", "comision": "A (tarde)"},
        {"nombre": "Ciencia de Datos I", "horario": "Miércoles 15:40–16:40", "comision": "A (tarde)"},
        {"nombre": "Tecnología y Sociedad", "horario": "Miércoles 17:00–18:00", "comision": "A (tarde)"},
        {"nombre": "Inglés II", "horario": "Jueves 14:20–15:20", "comision": "A (tarde)"},
        {"nombre": "Ciberseguridad", "horario": "Jueves 15:40–16:40", "comision": "A (tarde)"},
    ],
}

KEYWORDS = {
    "tareas": ["assign", "tarea", "entrega", "tp ", "trabajo práctico", "evidencia", "coloquio", "proyecto abp"],
    "materiales": ["material", "unidad", "libro", "recurso", "pdf", "archivo", "presentación"],
    "criterios": ["criterio", "evaluación", "acreditación", "régimen"],
    "avisos": ["aviso", "novedad", "comunicado", "foro"],
}


def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def match_materia(course_name: str) -> tuple[str | None, dict | None]:
    name_lower = course_name.lower()

    # Detectar carrera directamente desde el nombre del curso
    if "- tsds -" in name_lower:
        detected_carrera = "TSDS"
    elif "- tscdia -" in name_lower:
        detected_carrera = "TSCDIA"
    else:
        log(f"  [SKIP] Sin carrera reconocida: '{course_name}'")
        return None, None

    # Buscar la materia con mayor coincidencia dentro de la carrera
    best_match = None
    best_score = 0
    for m in MATERIAS_2026[detected_carrera]:
        keywords = [k for k in m["nombre"].lower().split() if len(k) > 2]
        score = sum(1 for k in keywords if k in name_lower)
        log(f"  [MATCH] '{course_name}' vs '{m['nombre']}' → score={score} (keywords={keywords})")
        if score > best_score:
            best_score = score
            best_match = m

    if best_score >= 1:
        return detected_carrera, best_match
    log(f"  [SKIP] Sin coincidencia suficiente para: '{course_name}'")
    return None, None


async def login(page, username: str, password: str):
    log("→ Login...")
    await page.goto(f"{BASE_URL}/login/index.php", wait_until="networkidle")
    log(f"  URL login: {page.url}")
    await page.fill("#username", username)
    await page.fill("#password", password)
    await page.click("#loginbtn")
    await page.wait_for_load_state("networkidle")
    log(f"  URL post-login: {page.url}")
    if "login" in page.url:
        raise Exception("Login fallido. Verificar credenciales.")
    log("✓ Login OK")


async def get_courses(page) -> list[dict]:
    log("→ Obteniendo lista de cursos (todas las páginas)...")

    courses = []
    seen = set()
    page_num = 1

    while True:
        url = f"{BASE_URL}/my/courses.php?page={page_num - 1}"
        log(f"  → Página {page_num}: {url}")
        await page.goto(url, wait_until="networkidle")

        links = await page.query_selector_all("a")
        found_this_page = 0

        for link in links:
            href = await link.get_attribute("href") or ""
            if "/course/view.php" not in href or href in seen:
                continue
            found_this_page += 1
            name = (await link.inner_text()).strip()
            seen.add(href)

            log(f"  [CURSO] '{name}' → {href}")

            if "2024" not in name and "2025" not in name:
                log(f"  [SKIP-AÑO] '{name}'")
                continue

            carrera, materia_info = match_materia(name)
            if carrera and materia_info:
                courses.append({
                    "nombre": materia_info["nombre"],
                    "carrera": carrera,
                    "horario": materia_info["horario"],
                    "comision": materia_info["comision"],
                    "url_campus": href,
                    "nombre_campus": name,
                })
                log(f"  ✓ MATCH: '{name}' → {materia_info['nombre']} ({carrera})")

        log(f"  Cursos en página {page_num}: {found_this_page}")

        # Verificar si hay página siguiente
        next_btn = await page.query_selector("a[aria-label='Siguiente']")
        if not next_btn and not await page.query_selector(f"a[aria-label='Página {page_num + 1}']"):
            log(f"  → No hay más páginas, terminando en página {page_num}")
            break

        page_num += 1
        if page_num > 10:  # Límite de seguridad
            break

    log(f"  Total materias matcheadas: {len(courses)}")
    return courses


async def extract_avisos(page, context) -> list[dict]:
    """Encuentra foros de Avisos en la página del curso y extrae todos los mensajes."""
    avisos = []

    # Buscar links a foros de avisos
    links = await page.query_selector_all("a")
    foro_urls = []
    for link in links:
        text = (await link.inner_text()).strip().lower()
        href = await link.get_attribute("href") or ""
        if "forum" in href and text in ("avisos", "avisos com a", "avisos com b", "avisos generales"):
            foro_urls.append((text, href))
            log(f"    [FORO] Encontrado: '{text}' → {href}")

    for foro_nombre, foro_url in foro_urls:
        try:
            foro_page = await context.new_page()
            await foro_page.goto(foro_url, wait_until="networkidle", timeout=20000)

            # Listar threads del foro
            thread_links = await foro_page.query_selector_all("a[href*='discuss.php']")
            log(f"    [FORO] '{foro_nombre}': {len(thread_links)} threads")

            for thread_link in thread_links:
                thread_href = await thread_link.get_attribute("href") or ""
                if not thread_href:
                    continue
                try:
                    thread_page = await context.new_page()
                    await thread_page.goto(thread_href, wait_until="networkidle", timeout=20000)

                    # Extraer posts del thread
                    posts = await thread_page.query_selector_all(".forumpost, .post")
                    for post in posts:
                        # Autor
                        autor_el = await post.query_selector(".author, .username, [data-region='author-name']")
                        autor = (await autor_el.inner_text()).strip() if autor_el else "Desconocido"

                        # Fecha
                        fecha_el = await post.query_selector(".postdate, time, .date")
                        fecha = (await fecha_el.inner_text()).strip() if fecha_el else ""
                        if not fecha:
                            fecha_el = await post.query_selector("time")
                            if fecha_el:
                                fecha = await fecha_el.get_attribute("datetime") or (await fecha_el.inner_text()).strip()

                        # Mensaje
                        msg_el = await post.query_selector(".posting, .post-content-container, [data-region='post-content']")
                        if not msg_el:
                            msg_el = await post.query_selector(".content")
                        mensaje = (await msg_el.inner_text()).strip() if msg_el else ""

                        if mensaje:
                            log(f"    [AVISO] {autor} - {fecha}: {mensaje[:60]}...")
                            avisos.append({
                                "titulo": foro_nombre.title(),
                                "autor": autor,
                                "fecha": fecha,
                                "mensaje": mensaje[:1000],
                                "url": thread_href,
                            })

                    await thread_page.close()
                except Exception as e:
                    log(f"    [ERROR-THREAD] {e}")
                    await thread_page.close()

            await foro_page.close()
        except Exception as e:
            log(f"    [ERROR-FORO] {foro_nombre}: {e}")

    return avisos


async def extract_programa(page) -> str:
    log("    → Buscando programa...")
    links = await page.query_selector_all("a")
    for link in links:
        text = (await link.inner_text()).strip().lower()
        if text in ("programa", "programa anual", "programa de la materia"):
            href = await link.get_attribute("href")
            log(f"    → Programa encontrado: {href}")
            if href:
                try:
                    prog_page = await page.context.new_page()
                    await prog_page.goto(href, wait_until="networkidle")
                    region = await prog_page.query_selector("#region-main")
                    if region:
                        content = (await region.inner_text()).strip()
                        await prog_page.close()
                        log(f"    ✓ Programa extraído ({len(content)} chars)")
                        return content[:5000]
                    await prog_page.close()
                except Exception as e:
                    log(f"    [ERROR] Programa: {e}")
    log("    → No se encontró programa")
    return ""


async def extract_course(page, course: dict) -> dict:
    log(f"\n--- {course['nombre']} ({course['carrera']}) ---")
    log(f"  URL: {course['url_campus']}")

    try:
        await page.goto(course["url_campus"], wait_until="networkidle", timeout=30000)
    except Exception as e:
        log(f"  [ERROR] No se pudo cargar la página: {e}")
        return _empty_result(course)

    log(f"  URL real: {page.url}")

    result = _empty_result(course)

    region = await page.query_selector("#region-main")
    if not region:
        log("  [WARN] No se encontró #region-main")
        return result

    all_links = await region.query_selector_all("a")
    log(f"  Links en la materia: {len(all_links)}")

    for link in all_links:
        text = (await link.inner_text()).strip()
        href = await link.get_attribute("href") or ""
        if not text or not href:
            continue
        text_lower = text.lower()

        if any(k in text_lower for k in ["programa"]) and len(text) < 50:
            pass  # Se extrae por separado
        elif any(k in text_lower for k in KEYWORDS["criterios"]):
            log(f"    [CRITERIO] {text}")
            result["criterios"] += f"• {text}\n"
        elif any(k in text_lower for k in KEYWORDS["avisos"]):
            pass  # Avisos se extraen por separado con extract_avisos()
        elif any(k in href for k in ["assign", "quiz", "workshop"]) or \
             any(k in text_lower for k in KEYWORDS["tareas"]):
            log(f"    [TAREA] {text} → {href}")
            result["tareas"].append({
                "nombre": text,
                "url": href,
                "fecha_entrega": None,
                "estado": "pendiente",
            })
        elif any(k in text_lower for k in KEYWORDS["materiales"]) or \
             any(href.endswith(ext) for ext in [".pdf", ".pptx", ".docx"]):
            tipo = "pdf" if ".pdf" in href.lower() else \
                   "video" if "youtube" in href or "vimeo" in href else \
                   "link"
            log(f"    [MATERIAL] {text} ({tipo})")
            result["materiales"].append({"nombre": text, "url": href, "tipo": tipo})

    result["programa"] = await extract_programa(page)
    result["avisos"] = await extract_avisos(page, page.context)

    # Fechas de tareas
    for tarea in result["tareas"]:
        try:
            t_page = await page.context.new_page()
            await t_page.goto(tarea["url"], wait_until="networkidle", timeout=15000)
            fecha_el = await t_page.query_selector(".submissionstatustable td")
            if fecha_el:
                fecha_text = (await fecha_el.inner_text()).strip()
                if fecha_text:
                    tarea["fecha_entrega"] = fecha_text
                    log(f"    [FECHA] {tarea['nombre']}: {fecha_text}")
            await t_page.close()
        except Exception as e:
            log(f"    [ERROR-FECHA] {tarea['nombre']}: {e}")

    log(f"  Resumen: {len(result['tareas'])} tareas | {len(result['materiales'])} materiales | programa={'sí' if result['programa'] else 'no'}")
    return result


def _empty_result(course: dict) -> dict:
    return {
        "nombre": course["nombre"],
        "carrera": course["carrera"],
        "horario": course["horario"],
        "comision": course["comision"],
        "url_campus": course["url_campus"],
        "programa": "",
        "criterios": "",
        "avisos": [],
        "tareas": [],
        "materiales": [],
        "ultima_actualizacion": datetime.now().isoformat(),
    }


async def main():
    username = os.environ.get("ISPC_USER", "")
    password = os.environ.get("ISPC_PASSWORD", "")
    is_ci = os.environ.get("CI", "false").lower() == "true"

    if is_ci:
        if not username or not password:
            log("ERROR: ISPC_USER y/o ISPC_PASSWORD no están definidos en los secrets de GitHub.")
            sys.exit(1)
    else:
        if not username:
            username = input("Usuario ISPC: ").strip()
        if not password:
            import getpass
            password = getpass.getpass("Contraseña ISPC: ")

    headless = is_ci
    log(f"Modo: {'CI headless' if is_ci else 'local con UI'}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await login(page, username, password)
            courses = await get_courses(page)

            if not courses:
                log("ERROR: No se encontraron materias. Revisá los logs de [CURSO] y [MATCH] arriba.")
                await browser.close()
                sys.exit(1)

            materias_data = []
            for course in courses:
                data = await extract_course(page, course)
                materias_data.append(data)

        except Exception as e:
            log(f"ERROR FATAL: {e}")
            import traceback
            traceback.print_exc()
            await browser.close()
            sys.exit(1)
        finally:
            await browser.close()

    output = {
        "usuario": "Franco Arce",
        "generado_el": datetime.now().isoformat(),
        "materias": materias_data,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"✅ JSON guardado en {OUTPUT_PATH}")
    log(f"   Materias procesadas: {len(materias_data)}")


if __name__ == "__main__":
    asyncio.run(main())
