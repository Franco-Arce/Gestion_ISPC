"""
ISPC Campus Scraper
Extrae datos del campus virtual ISPC y guarda en public/data/ispc_data.json
Corre via GitHub Actions diariamente o manualmente.
"""

import asyncio
import json
import os
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright

BASE_URL = "https://acceso.ispc.edu.ar"
OUTPUT_PATH = Path(__file__).parent.parent / "public" / "data" / "ispc_data.json"
FILES_DIR   = Path(__file__).parent.parent / "public" / "data" / "files"

MATERIAS_2026 = {
    "TSDS": [
        {"nombre": "Programación III",           "horario": "Martes 18:20–20:40",    "comision": "Única"},
        {"nombre": "Interfaz de Usuario",         "horario": "Martes 18:20–20:40",    "comision": "Única"},
        {"nombre": "Práctica Profesionalizante II","horario": "Miércoles 18:20–19:20", "comision": "Única"},
        {"nombre": "Ciencia de Datos",            "horario": "Miércoles 19:40–20:40", "comision": "Única"},
        {"nombre": "Ingeniería de Software",      "horario": "Jueves 18:20–19:20",    "comision": "Única"},
        {"nombre": "Gestión de Proyectos",        "horario": "Jueves 19:40–20:40",    "comision": "Única"},
    ],
    "TSCDIA": [
        {"nombre": "Estadística y Exploración de Datos I", "horario": "Martes 15:40–18:00",    "comision": "A (tarde)"},
        {"nombre": "Procesamiento de Datos",               "horario": "Martes 15:40–18:00",    "comision": "A (tarde)"},
        {"nombre": "Ciencia de Datos I",                   "horario": "Miércoles 15:40–16:40", "comision": "A (tarde)"},
        {"nombre": "Tecnología y Sociedad",                "horario": "Miércoles 17:00–18:00", "comision": "A (tarde)"},
        {"nombre": "Inglés II",                            "horario": "Jueves 14:20–15:20",    "comision": "A (tarde)"},
        {"nombre": "Ciberseguridad",                       "horario": "Jueves 15:40–16:40",    "comision": "A (tarde)"},
    ],
}

KEYWORDS = {
    "tareas":     ["assign", "tarea", "entrega", "tp ", "trabajo práctico", "evidencia", "coloquio", "proyecto abp"],
    "materiales": ["material", "unidad", "libro", "recurso", "pdf", "archivo", "presentación"],
    "criterios":  ["criterio", "evaluación", "acreditación", "régimen"],
    "avisos":     ["aviso", "novedad", "comunicado", "foro"],
}

RESOURCE_KEYWORDS = {
    "programa":      ["programa", "programa anual", "programa de la materia"],
    "hoja_de_ruta":  ["hoja de ruta", "hoja de ruta de aprendizaje", "recorrido"],
}

SECCIONES_ACTIVIDAD  = ["evidencias de aprendizajes", "proyecto abp", "coloquio", "coloquio - promoción"]
SECCIONES_CONTENIDO  = ["contenidos", "ciencia de datos", "programación", "interfaz", "ingeniería",
                        "gestión", "práctica", "estadística", "procesamiento", "tecnología",
                        "inglés", "ciberseguridad"]
SECCIONES_SINCRONICA = ["encuentros sincrónicos", "encuentros sincronicos", "sincrónicos", "sincronicos"]

MEET_RE = re.compile(r"https?://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}")


# ─── Helpers ────────────────────────────────────────────────────────────────

def log(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}", flush=True)


def safe_filename(s: str) -> str:
    """Convierte un string a nombre de archivo seguro (sin acentos, sin espacios)."""
    nfkd = unicodedata.normalize("NFKD", s)
    ascii_str = nfkd.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9_\-]", "", ascii_str.lower().replace(" ", "_"))


def match_materia(course_name: str) -> tuple[str | None, dict | None]:
    name_lower = course_name.lower()

    if "- tsds -" in name_lower:
        detected_carrera = "TSDS"
    elif "- tscdia -" in name_lower:
        detected_carrera = "TSCDIA"
    else:
        log(f"  [SKIP] Sin carrera reconocida en nombre: '{course_name}'")
        return None, None

    best_match = None
    best_score = 0
    for m in MATERIAS_2026[detected_carrera]:
        keywords = [k for k in m["nombre"].lower().split() if len(k) > 2]
        score = sum(1 for k in keywords if k in name_lower)
        log(f"  [MATCH] '{course_name}' vs '{m['nombre']}' → score={score}")
        if score > best_score:
            best_score = score
            best_match = m

    if best_score >= 1:
        log(f"  [OK] Match: '{course_name}' → '{best_match['nombre']}' ({detected_carrera})")
        return detected_carrera, best_match

    log(f"  [WARN] Sin coincidencia suficiente (score=0) para: '{course_name}' en {detected_carrera}")
    return None, None


# ─── Login ───────────────────────────────────────────────────────────────────

async def login(page, username: str, password: str):
    log("→ [LOGIN] Iniciando sesión...")
    await page.goto(f"{BASE_URL}/login/index.php", wait_until="networkidle")
    log(f"  [LOGIN] URL login: {page.url}")
    await page.fill("#username", username)
    await page.fill("#password", password)
    await page.click("#loginbtn")
    await page.wait_for_load_state("networkidle")
    log(f"  [LOGIN] URL post-login: {page.url}")
    if "login" in page.url:
        log("  [ERROR] Login fallido — verificar credenciales (ISPC_USER / ISPC_PASSWORD)")
        raise Exception("Login fallido.")
    log("  [OK] Login exitoso")


# ─── Cursos ──────────────────────────────────────────────────────────────────

async def get_courses(page) -> list[dict]:
    log("→ [CURSOS] Obteniendo lista de cursos...")
    courses = []
    seen_hrefs = set()

    for page_idx in range(10):
        url = f"{BASE_URL}/my/courses.php?page={page_idx}"
        log(f"  [CURSOS] Página {page_idx + 1}: {url}")
        await page.goto(url, wait_until="networkidle")

        links = await page.query_selector_all("a[href*='/course/view.php']")
        new_this_page = 0

        for link in links:
            href = await link.get_attribute("href") or ""
            if not href or href in seen_hrefs:
                continue
            seen_hrefs.add(href)
            new_this_page += 1
            name = (await link.inner_text()).strip()

            log(f"  [CURSO] '{name}' → {href}")

            if "2024" not in name and "2025" not in name:
                log(f"  [SKIP] Año de ingreso no reconocido en '{name}' (esperado 2024 o 2025)")
                continue

            carrera, materia_info = match_materia(name)
            if carrera and materia_info:
                courses.append({
                    "nombre":        materia_info["nombre"],
                    "carrera":       carrera,
                    "horario":       materia_info["horario"],
                    "comision":      materia_info["comision"],
                    "url_campus":    href,
                    "nombre_campus": name,
                })

        log(f"  [CURSOS] Cursos nuevos en página {page_idx + 1}: {new_this_page}")
        if new_this_page == 0:
            log(f"  [CURSOS] Página vacía — fin de paginación")
            break

    log(f"  [OK] Total materias matcheadas: {len(courses)}")
    return courses


# ─── Descarga de archivos (Programa / Hoja de Ruta) ─────────────────────────

async def download_resource_file(
    context, resource_url: str, save_path: Path, label: str, errores: list
) -> str | None:
    """
    Descarga un archivo de un mod/resource de Moodle.
    Devuelve la ruta relativa web (ej: '/data/files/foo.pdf') o None si falló.
    Agrega a `errores` el motivo exacto del fallo para el resumen final.
    """
    log(f"    [{label}] Navegando a recurso: {resource_url}")
    res_page = await context.new_page()

    try:
        await res_page.goto(resource_url, wait_until="networkidle", timeout=20000)
        current_url = res_page.url
        log(f"    [{label}] URL tras navegar: {current_url}")

        file_url = None

        # Caso 1: Moodle redirigió directamente al archivo (pluginfile.php)
        if "pluginfile.php" in current_url:
            file_url = current_url
            log(f"    [{label}] Redirección directa a pluginfile detectada")

        # Caso 2: La página tiene un link a pluginfile.php
        if not file_url:
            pf_link = await res_page.query_selector("a[href*='pluginfile.php']")
            if pf_link:
                file_url = await pf_link.get_attribute("href")
                log(f"    [{label}] Link pluginfile encontrado: {file_url[:80]}...")
            else:
                page_text = (await res_page.inner_text("body"))[:200].replace("\n", " ").strip()
                all_links = await res_page.query_selector_all("a[href]")
                hrefs = [await l.get_attribute("href") for l in all_links[:8]]
                msg = (
                    f"{label}: pluginfile.php no encontrado en la página del recurso.\n"
                    f"         URL final tras navegar: {current_url}\n"
                    f"         Texto visible: \"{page_text}\"\n"
                    f"         Links en página: {hrefs}"
                )
                log(f"    [{label}] [WARN] {msg.splitlines()[0]}")
                errores.append(msg)
                await res_page.close()
                return None

        await res_page.close()

        log(f"    [{label}] Descargando archivo desde: {file_url[:80]}...")
        response = await context.request.get(file_url, timeout=30000)

        if not response.ok:
            msg = (
                f"{label}: HTTP {response.status} al descargar el archivo.\n"
                f"         URL intentada: {file_url}"
            )
            log(f"    [{label}] [ERROR] {msg.splitlines()[0]}")
            errores.append(msg)
            return None

        content = await response.body()
        content_type = response.headers.get("content-type", "")
        log(f"    [{label}] Respuesta OK | content-type: {content_type} | tamaño: {len(content):,} bytes")

        if len(content) < 100:
            msg = (
                f"{label}: Archivo descargado demasiado pequeño ({len(content)} bytes) — no es el PDF real.\n"
                f"         content-type recibido: {content_type}\n"
                f"         URL: {file_url}"
            )
            log(f"    [{label}] [WARN] {msg.splitlines()[0]}")
            errores.append(msg)
            return None

        FILES_DIR.mkdir(parents=True, exist_ok=True)
        save_path.write_bytes(content)
        rel_path = f"/data/files/{save_path.name}"
        log(f"    [{label}] [OK] Guardado → {rel_path}")
        return rel_path

    except Exception as e:
        msg = (
            f"{label}: Excepción inesperada al descargar recurso.\n"
            f"         URL recurso: {resource_url}\n"
            f"         Error: {type(e).__name__}: {e}"
        )
        log(f"    [{label}] [ERROR] {msg.splitlines()[0]}")
        errores.append(msg)
        try:
            await res_page.close()
        except Exception:
            pass
        return None


async def extract_resource_link(page, keywords: list[str], label: str, errores: list) -> str | None:
    """
    Busca en la página un link cuyo texto coincida exactamente con alguno de los keywords.
    Si no lo encuentra, registra en errores los textos de links cercanos para ayudar a diagnosticar.
    """
    links = await page.query_selector_all("a")
    textos_vistos = []
    for link in links:
        text = (await link.inner_text()).strip()
        text_lower = text.lower()
        textos_vistos.append(text_lower)
        if text_lower in keywords:
            href = await link.get_attribute("href") or ""
            if href:
                log(f"    [{label}] Link encontrado: texto='{text}' href={href}")
                return href

    # No encontrado — buscar cuáles links de la zona de presentación podrían ser relevantes
    candidatos = [t for t in textos_vistos if any(k[:4] in t for k in keywords) and t][:8]
    msg = (
        f"{label}: No se encontró link con texto {keywords}.\n"
        f"         Links similares encontrados en la página: {candidatos if candidatos else '(ninguno)'}\n"
        f"         → Puede que tenga otro nombre en el campus o que aún no esté publicado."
    )
    log(f"    [{label}] [WARN] {msg.splitlines()[0]}")
    errores.append(msg)
    return None


async def extract_programa(page, context, materia_nombre: str, errores: list) -> str | None:
    """Busca el link 'Programa' y descarga el archivo. Retorna ruta relativa o None."""
    log("    → [PROGRAMA] Buscando...")
    href = await extract_resource_link(page, RESOURCE_KEYWORDS["programa"], "PROGRAMA", errores)
    if not href:
        return None
    fname = safe_filename(materia_nombre)
    save_path = FILES_DIR / f"{fname}_programa.pdf"
    return await download_resource_file(context, href, save_path, "PROGRAMA", errores)


async def extract_hoja_de_ruta(page, context, materia_nombre: str, errores: list) -> str | None:
    """Busca el link 'Hoja de Ruta' y descarga el archivo. Retorna ruta relativa o None."""
    log("    → [HOJA_RUTA] Buscando...")
    href = await extract_resource_link(page, RESOURCE_KEYWORDS["hoja_de_ruta"], "HOJA_RUTA", errores)
    if not href:
        return None
    fname = safe_filename(materia_nombre)
    save_path = FILES_DIR / f"{fname}_hoja_de_ruta.pdf"
    return await download_resource_file(context, href, save_path, "HOJA_RUTA", errores)


# ─── Avisos ──────────────────────────────────────────────────────────────────

async def extract_avisos(page, context, errores: list) -> list[dict]:
    """Encuentra foros de Avisos en la página del curso y extrae todos los mensajes."""
    avisos = []

    links = await page.query_selector_all("a")
    foro_urls = []
    todos_foros = []
    for link in links:
        text = (await link.inner_text()).strip().lower()
        href = await link.get_attribute("href") or ""
        if "forum" in href:
            todos_foros.append(f"'{text}' → {href}")
        if "forum" in href and text in ("avisos", "avisos com a", "avisos com b", "avisos generales"):
            foro_urls.append((text, href))
            log(f"    [FORO] Encontrado: '{text}' → {href}")

    if not foro_urls:
        msg = (
            f"Avisos: No se encontró ningún foro con nombre 'avisos' / 'avisos com a' / 'avisos com b'.\n"
            f"         Foros con href*='forum' encontrados en la página: {todos_foros[:6] if todos_foros else '(ninguno)'}\n"
            f"         → ¿El foro tiene otro nombre? Revisar el selector de texto en extract_avisos."
        )
        log(f"    [FORO] [WARN] {msg.splitlines()[0]}")
        errores.append(msg)

    for foro_nombre, foro_url in foro_urls:
        try:
            foro_page = await context.new_page()
            await foro_page.goto(foro_url, wait_until="networkidle", timeout=20000)

            raw_links = await foro_page.query_selector_all("a[href*='discuss.php']")
            seen_threads: set[str] = set()
            thread_hrefs: list[str] = []
            for tl in raw_links:
                href = await tl.get_attribute("href") or ""
                m = re.search(r"discuss\.php\?d=(\d+)", href)
                if m:
                    canonical = f"{BASE_URL}/mod/forum/discuss.php?d={m.group(1)}"
                    if canonical not in seen_threads:
                        seen_threads.add(canonical)
                        thread_hrefs.append(canonical)
            log(f"    [FORO] '{foro_nombre}': {len(thread_hrefs)} threads únicos encontrados")

            for thread_href in thread_hrefs:
                try:
                    thread_page = await context.new_page()
                    await thread_page.goto(thread_href, wait_until="networkidle", timeout=20000)

                    all_posts = await thread_page.query_selector_all(".forumpost, .post, [data-region='post']")
                    posts = all_posts[:1] if all_posts else []
                    log(f"    [FORO] Thread {thread_href.split('=')[-1]}: {len(all_posts)} posts, procesando OP")

                    for post in posts:
                        autor = "Desconocido"
                        for sel in [
                            "[data-region='author-name']", ".author a", ".author",
                            ".username", ".h6.mb-0 a", ".post-author-name", "a[href*='user/view']",
                        ]:
                            autor_el = await post.query_selector(sel)
                            if autor_el:
                                t = (await autor_el.inner_text()).strip()
                                if t:
                                    autor = t
                                    break

                        fecha = ""
                        time_el = await post.query_selector("time[datetime]")
                        if time_el:
                            fecha = await time_el.get_attribute("datetime") or ""
                        if not fecha:
                            for sel in [".postdate", ".date", "time", ".post-date"]:
                                fecha_el = await post.query_selector(sel)
                                if fecha_el:
                                    t = (await fecha_el.inner_text()).strip()
                                    if t:
                                        fecha = t
                                        break

                        msg_el = await post.query_selector(".posting, .post-content-container, [data-region='post-content']")
                        if not msg_el:
                            msg_el = await post.query_selector(".content")
                        mensaje = (await msg_el.inner_text()).strip() if msg_el else ""

                        if mensaje:
                            log(f"    [AVISO] {autor} — {fecha[:19]}: {mensaje[:60]}...")
                            avisos.append({
                                "titulo":  foro_nombre.title(),
                                "autor":   autor,
                                "fecha":   fecha,
                                "mensaje": mensaje[:1000],
                                "url":     thread_href,
                            })
                        else:
                            log(f"    [FORO] [WARN] Post sin mensaje en {thread_href}")

                    await thread_page.close()
                except Exception as e:
                    log(f"    [FORO] [ERROR] Procesando thread {thread_href}: {e}")
                    try: await thread_page.close()
                    except Exception: pass

            await foro_page.close()
        except Exception as e:
            log(f"    [FORO] [ERROR] Procesando foro '{foro_nombre}': {e}")

    log(f"    [FORO] Total avisos extraídos: {len(avisos)}")
    return avisos


# ─── Secciones (Unidades + Actividades) ─────────────────────────────────────

async def extract_meet_from_section(context, section_url: str, errores: list) -> str | None:
    """
    Entra a la sección 'Encuentros Sincrónicos', busca el link a 'Sala de Encuentro Sincrónico'
    (un mod/page), navega a él y extrae la URL de Google Meet del contenido.
    """
    log("    [MEET] Entrando a sección Encuentros Sincrónicos...")
    sec_page = await context.new_page()
    try:
        await sec_page.goto(section_url, wait_until="networkidle", timeout=20000)

        # Buscar el link a "Sala de Encuentro Sincrónico" (mod/page)
        sala_link = None
        all_links = await sec_page.query_selector_all("a[href*='mod/page']")
        for link in all_links:
            text = (await link.inner_text()).strip().lower()
            if "sala" in text or "encuentro sincrónico" in text or "encuentro sincroni" in text:
                sala_link = await link.get_attribute("href")
                log(f"    [MEET] Link de sala encontrado: texto='{text}' href={sala_link}")
                break

        if not sala_link:
            # Listar todos los links de la sección para diagnóstico
            todos = []
            for link in await sec_page.query_selector_all("a[href]"):
                t = (await link.inner_text()).strip()
                h = await link.get_attribute("href")
                todos.append(f"'{t}' → {h}")
            msg = (
                f"Meet: No se encontró 'Sala de Encuentro Sincrónico' (mod/page) en la sección.\n"
                f"       Links encontrados en la sección: {todos[:8]}"
            )
            log(f"    [MEET] [WARN] {msg.splitlines()[0]}")
            errores.append(msg)
            await sec_page.close()
            return None

        await sec_page.close()

        # Navegar a la página de la sala y extraer el Meet URL
        sala_page = await context.new_page()
        await sala_page.goto(sala_link, wait_until="networkidle", timeout=20000)
        body_text = await sala_page.inner_text("body")

        meet_match = MEET_RE.search(body_text)
        if meet_match:
            meet_url = meet_match.group(0)
            log(f"    [MEET] [OK] URL extraída: {meet_url}")
            await sala_page.close()
            return meet_url

        # No encontró Meet URL — loguear el contenido para diagnóstico
        body_snippet = body_text[:400].replace("\n", " ").strip()
        # Buscar cualquier link en la página
        hrefs = [await l.get_attribute("href") for l in await sala_page.query_selector_all("a[href]")]
        msg = (
            f"Meet: Se abrió la Sala de Encuentro Sincrónico pero no se encontró URL meet.google.com.\n"
            f"       URL de la sala: {sala_link}\n"
            f"       Texto visible: \"{body_snippet}\"\n"
            f"       Links en la página: {hrefs[:10]}\n"
            f"       → Puede que el formato del link sea diferente o que no esté cargado aún."
        )
        log(f"    [MEET] [WARN] {msg.splitlines()[0]}")
        errores.append(msg)
        await sala_page.close()
        return None

    except Exception as e:
        msg = (
            f"Meet: Excepción al entrar a Encuentros Sincrónicos.\n"
            f"       URL sección: {section_url}\n"
            f"       Error: {type(e).__name__}: {e}"
        )
        log(f"    [MEET] [ERROR] {msg.splitlines()[0]}")
        errores.append(msg)
        try: await sec_page.close()
        except Exception: pass
        return None


async def extract_sections(page, context, course_name: str, errores: list) -> tuple[list[dict], list[dict], str | None]:
    """
    Extrae unidades de contenido, actividades y el link de Meet de las secciones del curso.
    Retorna (unidades, tareas_con_detalle, meet_url)
    """
    unidades = []
    tareas_detalle = []
    meet_url = None

    section_links = await page.query_selector_all("a[href*='section.php']")
    log(f"    [SECCIONES] Encontradas: {len(section_links)}")

    if not section_links:
        all_a = await page.query_selector_all("a[href]")
        hrefs_muestra = [await a.get_attribute("href") for a in all_a[:10]]
        msg = (
            f"Secciones: No se encontraron links a[href*='section.php'] en la página.\n"
            f"           URL actual: {page.url}\n"
            f"           Primeros 10 hrefs en la página: {hrefs_muestra}\n"
            f"           → La materia puede estar vacía, usar otro layout, o necesitar login renovado."
        )
        log(f"    [SECCIONES] [WARN] {msg.splitlines()[0]}")
        errores.append(msg)

    for sec_link in section_links:
        sec_text = (await sec_link.inner_text()).strip()
        sec_href = await sec_link.get_attribute("href") or ""
        if not sec_href:
            continue

        sec_lower = sec_text.lower()
        log(f"    [SECCION] '{sec_text}' → {sec_href}")

        is_sincronica = any(k in sec_lower for k in SECCIONES_SINCRONICA)
        is_actividad  = any(k in sec_lower for k in SECCIONES_ACTIVIDAD)
        is_contenido  = any(k in sec_lower for k in SECCIONES_CONTENIDO) or \
                        course_name.lower().split()[0] in sec_lower

        # Extraer Meet de Encuentros Sincrónicos (solo la primera vez)
        if is_sincronica and meet_url is None:
            log(f"    [SECCION] Detectada sección sincrónica: '{sec_text}'")
            meet_url = await extract_meet_from_section(context, sec_href, errores)
            continue

        if not is_actividad and not is_contenido:
            log(f"    [SECCION] [SKIP] '{sec_text}' no es actividad ni contenido conocido")
            continue

        try:
            sec_page = await context.new_page()
            await sec_page.goto(sec_href, wait_until="networkidle", timeout=20000)

            if is_contenido:
                all_links = await sec_page.query_selector_all("a")
                found_units = 0
                for link in all_links:
                    text = (await link.inner_text()).strip()
                    href = await link.get_attribute("href") or ""
                    if "unidad" in text.lower() and href:
                        log(f"    [UNIDAD] {text}")
                        unidades.append({"nombre": text, "url": href, "descripcion": ""})
                        found_units += 1
                log(f"    [SECCION] '{sec_text}': {found_units} unidades encontradas")

            if is_actividad:
                assign_links = await sec_page.query_selector_all(
                    "a[href*='assign'], a[href*='quiz'], a[href*='workshop']"
                )
                log(f"    [SECCION] '{sec_text}': {len(assign_links)} actividades encontradas")
                for a_link in assign_links:
                    a_text = (await a_link.inner_text()).strip()
                    a_href = await a_link.get_attribute("href") or ""
                    if not a_text or not a_href:
                        continue

                    fecha = None
                    descripcion = ""
                    estado = "pendiente"
                    try:
                        act_page = await context.new_page()
                        await act_page.goto(a_href, wait_until="networkidle", timeout=15000)

                        # Descripción
                        desc_el = await act_page.query_selector(".activity-description, .box.generalbox, #intro")
                        if desc_el:
                            descripcion = (await desc_el.inner_text()).strip()[:500]

                        # Fecha límite — preferir ISO de <time>
                        time_el = await act_page.query_selector(".submissionstatustable time[datetime]")
                        if time_el:
                            fecha = await time_el.get_attribute("datetime") or None

                        if not fecha:
                            for selector in [
                                ".submissionstatustable td",
                                ".due-date",
                                "[data-region='activity-due-date']",
                            ]:
                                el = await act_page.query_selector(selector)
                                if el:
                                    t = (await el.inner_text()).strip()
                                    if t and any(c.isdigit() for c in t):
                                        fecha = t
                                        break

                        # Estado de entrega
                        status_el = await act_page.query_selector(".submissionstatustable")
                        if status_el:
                            status_text = (await status_el.inner_text()).lower()
                            if "enviado" in status_text or "submitted" in status_text:
                                estado = "entregada"
                            elif "tarde" in status_text or "vencid" in status_text:
                                estado = "vencida"

                        await act_page.close()
                    except Exception as e:
                        log(f"    [ACTIVIDAD] [ERROR] Procesando '{a_text}': {e}")
                        try: await act_page.close()
                        except Exception: pass

                    log(f"    [ACTIVIDAD] '{a_text}' | estado={estado} | fecha={fecha} | sección='{sec_text}'")
                    tareas_detalle.append({
                        "nombre":        a_text,
                        "url":           a_href,
                        "fecha_entrega": fecha,
                        "estado":        estado,
                        "descripcion":   descripcion,
                        "seccion":       sec_text,
                    })

            await sec_page.close()
        except Exception as e:
            log(f"    [SECCION] [ERROR] '{sec_text}': {e}")
            try: await sec_page.close()
            except Exception: pass

    if meet_url:
        log(f"    [MEET] [OK] Meet extraído: {meet_url}")
    else:
        log("    [MEET] No se pudo extraer el link de Meet")

    return unidades, tareas_detalle, meet_url


# ─── Extracción por curso ─────────────────────────────────────────────────────

async def extract_course(page, course: dict) -> dict:
    log(f"\n{'='*60}")
    log(f"  MATERIA: {course['nombre']} ({course['carrera']})")
    log(f"  URL:     {course['url_campus']}")
    log(f"{'='*60}")

    try:
        await page.goto(course["url_campus"], wait_until="networkidle", timeout=30000)
    except Exception as e:
        log(f"  [ERROR] No se pudo cargar la página del curso: {e}")
        return _empty_result(course)

    log(f"  URL real: {page.url}")

    result = _empty_result(course)

    region = await page.query_selector("#region-main")
    if not region:
        log("  [WARN] No se encontró #region-main — la página puede tener un layout distinto")
        return result

    all_links = await region.query_selector_all("a")
    log(f"  Links totales en #region-main: {len(all_links)}")

    for link in all_links:
        text = (await link.inner_text()).strip()
        href = await link.get_attribute("href") or ""
        if not text or not href:
            continue
        text_lower = text.lower()

        if any(k in text_lower for k in KEYWORDS["criterios"]):
            log(f"    [CRITERIO] {text}")
            result["criterios"] += f"• {text}\n"
        elif any(k in href for k in ["assign", "quiz", "workshop"]) or \
             any(k in text_lower for k in KEYWORDS["tareas"]):
            log(f"    [TAREA-RAIZ] {text} → {href}")
            result["tareas"].append({
                "nombre":        text,
                "url":           href,
                "fecha_entrega": None,
                "estado":        "pendiente",
            })
        elif any(k in text_lower for k in KEYWORDS["materiales"]) or \
             any(href.endswith(ext) for ext in [".pdf", ".pptx", ".docx"]):
            tipo = "pdf"   if ".pdf"     in href.lower() else \
                   "video" if "youtube"  in href or "vimeo" in href else \
                   "link"
            log(f"    [MATERIAL] {text} ({tipo})")
            result["materiales"].append({"nombre": text, "url": href, "tipo": tipo})

    errores: list[str] = []

    # Programa y Hoja de Ruta
    result["programa_archivo"]      = await extract_programa(page, page.context, course["nombre"], errores)
    result["hoja_de_ruta_archivo"]  = await extract_hoja_de_ruta(page, page.context, course["nombre"], errores)

    # Avisos
    result["avisos"] = await extract_avisos(page, page.context, errores)

    # Secciones (unidades + actividades enriquecidas)
    unidades, tareas_detalle, meet_url = await extract_sections(page, page.context, course["nombre"], errores)
    result["unidades"]  = unidades
    result["meet_url"]  = meet_url
    if tareas_detalle:
        log(f"  [INFO] Reemplazando tareas básicas ({len(result['tareas'])}) con tareas enriquecidas ({len(tareas_detalle)})")
        result["tareas"] = tareas_detalle

    # Advertencias si quedaron vacíos después de procesar todo
    if not result["unidades"]:
        errores.append(
            "Unidades: 0 unidades extraídas tras procesar todas las secciones.\n"
            "           → Revisar SECCIONES_CONTENIDO o que las secciones de contenido tengan links con 'unidad' en el texto."
        )
    if not result["tareas"]:
        errores.append(
            "Tareas: 0 tareas encontradas. No hay secciones de actividades o no tienen assigns/quizzes aún.\n"
            "        → Puede ser normal al inicio del cuatrimestre si el docente no cargó las actividades todavía."
        )

    # Fechas para tareas sin fecha (fallback)
    sin_fecha = [t for t in result["tareas"] if not t.get("fecha_entrega")]
    if sin_fecha:
        log(f"  [FECHAS] {len(sin_fecha)} tareas sin fecha — intentando extraer...")
    for tarea in sin_fecha:
        try:
            t_page = await page.context.new_page()
            await t_page.goto(tarea["url"], wait_until="networkidle", timeout=15000)

            time_el = await t_page.query_selector(".submissionstatustable time[datetime]")
            if time_el:
                tarea["fecha_entrega"] = await time_el.get_attribute("datetime") or None
            else:
                fecha_el = await t_page.query_selector(".submissionstatustable td")
                if fecha_el:
                    tarea["fecha_entrega"] = (await fecha_el.inner_text()).strip() or None

            log(f"    [FECHA] '{tarea['nombre']}': {tarea['fecha_entrega']}")
            await t_page.close()
        except Exception as e:
            log(f"    [FECHA] [ERROR] '{tarea['nombre']}': {e}")

    result["_errores"] = errores

    log(f"\n  ── Resumen {course['nombre']} ──")
    log(f"     Avisos:        {len(result['avisos'])}")
    log(f"     Tareas:        {len(result['tareas'])}")
    log(f"     Unidades:      {len(result['unidades'])}")
    log(f"     Materiales:    {len(result['materiales'])}")
    log(f"     Meet:          {'✓ ' + result['meet_url'] if result['meet_url'] else '✗ no encontrado'}")
    log(f"     Programa:      {'✓ ' + result['programa_archivo'] if result['programa_archivo'] else '✗ no encontrado'}")
    log(f"     Hoja de Ruta:  {'✓ ' + result['hoja_de_ruta_archivo'] if result['hoja_de_ruta_archivo'] else '✗ no encontrada'}")
    if errores:
        log(f"     Errores:       {len(errores)} problema(s) registrado(s)")

    return result


def _empty_result(course: dict) -> dict:
    return {
        "nombre":              course["nombre"],
        "carrera":             course["carrera"],
        "horario":             course["horario"],
        "comision":            course["comision"],
        "url_campus":          course["url_campus"],
        "criterios":           "",
        "avisos":              [],
        "unidades":            [],
        "tareas":              [],
        "materiales":          [],
        "meet_url":             None,
        "programa_archivo":     None,
        "hoja_de_ruta_archivo": None,
        "ultima_actualizacion": datetime.now().isoformat(),
        "_errores":             [],    # se elimina antes de guardar el JSON
    }


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main():
    username = os.environ.get("ISPC_USER", "")
    password = os.environ.get("ISPC_PASSWORD", "")
    is_ci    = os.environ.get("CI", "false").lower() == "true"

    if is_ci:
        if not username or not password:
            log("[ERROR] ISPC_USER y/o ISPC_PASSWORD no están definidos en los secrets de GitHub.")
            sys.exit(1)
    else:
        if not username:
            username = input("Usuario ISPC: ").strip()
        if not password:
            import getpass
            password = getpass.getpass("Contraseña ISPC: ")

    headless = is_ci
    log(f"[INFO] Modo: {'CI headless' if is_ci else 'local con UI'}")
    log(f"[INFO] Output JSON: {OUTPUT_PATH}")
    log(f"[INFO] Directorio archivos: {FILES_DIR}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context()
        page    = await context.new_page()

        try:
            await login(page, username, password)
            courses = await get_courses(page)

            if not courses:
                log("[ERROR] No se encontraron materias. Revisá los logs de [CURSO] y [MATCH] arriba.")
                await browser.close()
                sys.exit(1)

            log(f"\n[INFO] Procesando {len(courses)} materias...\n")
            materias_data = []
            for course in courses:
                data = await extract_course(page, course)
                materias_data.append(data)

        except Exception as e:
            log(f"[ERROR FATAL] {e}")
            import traceback
            traceback.print_exc()
            await browser.close()
            sys.exit(1)
        finally:
            await browser.close()

    output = {
        "usuario":     "Franco Arce",
        "generado_el": datetime.now().isoformat(),
        "materias":    materias_data,
    }

    # Extraer errores antes de serializar (no van al JSON)
    errores_por_materia = {m["nombre"]: m.pop("_errores", []) for m in materias_data}

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── Resumen final ────────────────────────────────────────────────────────
    COL = 32
    log(f"\n{'═'*72}")
    log(f"  RESUMEN FINAL — {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    log(f"{'═'*72}")
    log(f"  {'MATERIA':<{COL}} {'AVI':>3} {'TAR':>3} {'UNI':>3} {'MAT':>3}  {'PROG':>6}  {'RUTA':>6}  {'ERR':>3}")
    log(f"  {'─'*COL} {'───':>3} {'───':>3} {'───':>3} {'───':>3}  {'──────':>6}  {'──────':>6}  {'───':>3}")

    for m in materias_data:
        prog  = "✓" if m.get("programa_archivo")     else "✗"
        ruta  = "✓" if m.get("hoja_de_ruta_archivo") else "✗"
        n_err = len(errores_por_materia.get(m["nombre"], []))
        err_s = str(n_err) if n_err else "─"
        log(
            f"  {m['nombre'][:COL]:<{COL}} "
            f"{len(m.get('avisos', [])):>3} "
            f"{len(m.get('tareas', [])):>3} "
            f"{len(m.get('unidades', [])):>3} "
            f"{len(m.get('materiales', [])):>3}  "
            f"{prog:>6}  {ruta:>6}  {err_s:>3}"
        )

    log(f"  {'─'*COL} {'───':>3} {'───':>3} {'───':>3} {'───':>3}  {'──────':>6}  {'──────':>6}  {'───':>3}")
    log(
        f"  {'TOTALES':<{COL}} "
        f"{sum(len(m.get('avisos',[]))    for m in materias_data):>3} "
        f"{sum(len(m.get('tareas',[]))    for m in materias_data):>3} "
        f"{sum(len(m.get('unidades',[]))  for m in materias_data):>3} "
        f"{sum(len(m.get('materiales',[]))for m in materias_data):>3}  "
        f"{sum(1 for m in materias_data if m.get('programa_archivo')):>5}✓  "
        f"{sum(1 for m in materias_data if m.get('hoja_de_ruta_archivo')):>5}✓  "
        f"{sum(len(v) for v in errores_por_materia.values()):>3}"
    )
    log(f"\n  Leyenda: AVI=avisos  TAR=tareas  UNI=unidades  MAT=materiales  PROG=programa  RUTA=hoja de ruta  ERR=errores")

    # ── Detalle de errores por materia ───────────────────────────────────────
    materias_con_error = [(n, errs) for n, errs in errores_por_materia.items() if errs]
    if materias_con_error:
        log(f"\n{'─'*72}")
        log(f"  ⚠  ERRORES DETALLADOS ({sum(len(e) for _,e in materias_con_error)} problemas en {len(materias_con_error)} materias)")
        log(f"{'─'*72}")
        for nombre, errs in materias_con_error:
            log(f"\n  ▶ {nombre}")
            for i, err in enumerate(errs, 1):
                # Indentar cada línea del error
                lines = err.splitlines()
                log(f"    {i}. {lines[0]}")
                for line in lines[1:]:
                    log(f"       {line}")
    else:
        log(f"\n  ✅ Sin errores — todo extraído correctamente en todas las materias")

    archivos_pdf = list(FILES_DIR.glob("*.pdf")) if FILES_DIR.exists() else []
    log(f"\n  PDFs descargados: {len(archivos_pdf)}")
    for f in archivos_pdf:
        log(f"    ✓ {f.name}  ({f.stat().st_size:,} bytes)")

    log(f"\n  ✅ JSON guardado: {OUTPUT_PATH}")
    log(f"{'═'*72}")


if __name__ == "__main__":
    asyncio.run(main())
