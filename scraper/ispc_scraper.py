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


def match_materia(course_name: str) -> tuple[str | None, dict | None]:
    name_lower = course_name.lower()
    for carrera, materias in MATERIAS_2026.items():
        for m in materias:
            keywords = m["nombre"].lower().split()
            # Necesita al menos 2 palabras clave para matchear
            matches = sum(1 for k in keywords if k in name_lower and len(k) > 3)
            if matches >= 2:
                return carrera, m
    return None, None


async def login(page, username: str, password: str):
    print("→ Login...")
    await page.goto(f"{BASE_URL}/login/index.php", wait_until="networkidle")
    print(f"  URL: {page.url}")
    # Debug: mostrar inputs disponibles
    inputs = await page.query_selector_all("input")
    for inp in inputs:
        id_ = await inp.get_attribute("id")
        name = await inp.get_attribute("name")
        type_ = await inp.get_attribute("type")
        print(f"  input: id={id_} name={name} type={type_}")
    await page.fill("#username", username)
    await page.fill("#password", password)
    await page.click("#loginbtn")
    await page.wait_for_load_state("networkidle")
    print(f"  URL post-login: {page.url}")
    if "login" in page.url:
        await page.screenshot(path="login_error.png")
        raise Exception("Login fallido. Verificar credenciales y selectores del formulario.")
    print("✓ Login OK")


async def get_courses(page) -> list[dict]:
    print("→ Obteniendo cursos 2026...")
    await page.goto(f"{BASE_URL}/my/courses.php", wait_until="networkidle")

    courses = []
    links = await page.query_selector_all("a")
    seen = set()

    for link in links:
        href = await link.get_attribute("href") or ""
        if "/course/view.php" not in href or href in seen:
            continue
        name = (await link.inner_text()).strip()
        if "2026" not in name:
            continue
        seen.add(href)
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
            print(f"  ✓ {name} → {materia_info['nombre']} ({carrera})")

    print(f"  Total: {len(courses)} materias")
    return courses


async def extract_programa(page) -> str:
    """Busca y extrae el texto del programa de la materia."""
    links = await page.query_selector_all("a")
    for link in links:
        text = (await link.inner_text()).strip().lower()
        if text in ("programa", "programa anual", "programa de la materia"):
            href = await link.get_attribute("href")
            if href:
                try:
                    prog_page = await page.context.new_page()
                    await prog_page.goto(href, wait_until="networkidle")
                    region = await prog_page.query_selector("#region-main")
                    if region:
                        content = (await region.inner_text()).strip()
                        await prog_page.close()
                        return content[:5000]
                    await prog_page.close()
                except Exception:
                    pass
    return ""


async def extract_course(page, course: dict) -> dict:
    print(f"\n  → {course['nombre']}")
    await page.goto(course["url_campus"], wait_until="networkidle")

    result = {
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

    region = await page.query_selector("#region-main")
    if not region:
        return result

    all_links = await region.query_selector_all("a")

    for link in all_links:
        text = (await link.inner_text()).strip()
        href = await link.get_attribute("href") or ""
        if not text or not href:
            continue
        text_lower = text.lower()

        if any(k in text_lower for k in ["programa"]) and len(text) < 50:
            # Se extrae por separado
            pass
        elif any(k in text_lower for k in KEYWORDS["criterios"]):
            result["criterios"] += f"• {text}\n"
        elif any(k in text_lower for k in KEYWORDS["avisos"]):
            result["avisos"].append(text)
        elif any(k in href for k in ["assign", "quiz", "workshop"]) or \
             any(k in text_lower for k in KEYWORDS["tareas"]):
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
            result["materiales"].append({
                "nombre": text,
                "url": href,
                "tipo": tipo,
            })

    # Extraer programa
    result["programa"] = await extract_programa(page)

    # Intentar obtener fechas de tareas
    for tarea in result["tareas"]:
        try:
            t_page = await page.context.new_page()
            await t_page.goto(tarea["url"], wait_until="networkidle")
            # Buscar fecha en la página de la tarea
            fecha_el = await t_page.query_selector(".submissionstatustable td")
            if fecha_el:
                fecha_text = (await fecha_el.inner_text()).strip()
                if fecha_text:
                    tarea["fecha_entrega"] = fecha_text
            await t_page.close()
        except Exception:
            pass

    print(f"     Tareas: {len(result['tareas'])} | Materiales: {len(result['materiales'])}")
    return result


async def main():
    username = os.environ.get("ISPC_USER", "")
    password = os.environ.get("ISPC_PASSWORD", "")
    is_ci = os.environ.get("CI", "false").lower() == "true"

    # En CI, fallar si no hay credenciales
    if is_ci:
        if not username or not password:
            print("ERROR: ISPC_USER y/o ISPC_PASSWORD no están definidos en los secrets de GitHub.")
            sys.exit(1)
    else:
        # Uso local: pedir interactivamente si faltan
        if not username:
            username = input("Usuario ISPC: ").strip()
        if not password:
            import getpass
            password = getpass.getpass("Contraseña ISPC: ")

    headless = is_ci

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            await login(page, username, password)
            courses = await get_courses(page)

            if not courses:
                print("No se encontraron materias para 2026.")
                # Listar todos para debug
                links = await page.query_selector_all("a")
                for link in links:
                    href = await link.get_attribute("href") or ""
                    if "/course/view.php" in href:
                        name = (await link.inner_text()).strip()
                        print(f"  Disponible: {name}")
                await browser.close()
                sys.exit(1)

            materias_data = []
            for course in courses:
                data = await extract_course(page, course)
                materias_data.append(data)

        finally:
            await browser.close()

    output = {
        "usuario": "Franco Arce",
        "generado_el": datetime.now().isoformat(),
        "materias": materias_data,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✅ JSON guardado en {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
