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

SECCIONES_ACTIVIDAD = ["evidencias de aprendizajes", "proyecto abp", "coloquio", "coloquio - promoción"]
SECCIONES_CONTENIDO = ["contenidos", "ciencia de datos", "programación", "interfaz", "ingeniería",
                       "gestión", "práctica", "estadística", "procesamiento", "tecnología",
                       "inglés", "ciberseguridad"]


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

async def download_resource_file(context, resource_url: str, save_path: Path, label: str) -> str | None:
    """
    Descarga un archivo de un mod/resource de Moodle.
    Devuelve la ruta relativa web (ej: '/data/files/foo.pdf') o None si falló.

    Flujo:
    1. Navega a la página del recurso (mod/resource/view.php?id=...)
    2. Busca el link a pluginfile.php (la URL real del archivo)
    3. Descarga el contenido con context.request (hereda las cookies de sesión)
    4. Guarda en FILES_DIR y retorna la ruta relativa
    """
    log(f"    [{label}] Navegando a recurso: {resource_url}")
    res_page = await context.new_page()

    try:
        await res_page.goto(resource_url, wait_until="networkidle", timeout=20000)
        current_url = res_page.url
        log(f"    [{label}] URL tras navegar: {current_url}")

        # Caso 1: Moodle redirigió directamente al archivo (pluginfile.php)
        file_url = None
        if "pluginfile.php" in current_url:
            file_url = current_url
            log(f"    [{label}] Redirección directa a pluginfile detectada")

        # Caso 2: La página tiene un link a pluginfile.php
        if not file_url:
            pf_link = await res_page.query_selector("a[href*='pluginfile.php']")
            if pf_link:
                file_url = await pf_link.get_attribute("href")
                log(f"    [{label}] Link pluginfile encontrado en página: {file_url[:80]}...")
            else:
                # Loguear qué hay en la página para diagnosticar
                page_text = (await res_page.inner_text("body"))[:300].replace("\n", " ")
                all_links = await res_page.query_selector_all("a[href]")
                hrefs = [await l.get_attribute("href") for l in all_links[:10]]
                log(f"    [{label}] [WARN] No se encontró pluginfile.php")
                log(f"    [{label}] [WARN] Texto visible: {page_text}")
                log(f"    [{label}] [WARN] Links en página: {hrefs}")
                await res_page.close()
                return None

        await res_page.close()

        # Descargar el archivo usando las cookies de sesión del contexto
        log(f"    [{label}] Descargando archivo...")
        response = await context.request.get(file_url, timeout=30000)

        if not response.ok:
            log(f"    [{label}] [ERROR] HTTP {response.status} al descargar {file_url[:80]}")
            return None

        content = await response.body()
        content_type = response.headers.get("content-type", "")
        log(f"    [{label}] Respuesta: {response.status} | content-type: {content_type} | tamaño: {len(content)} bytes")

        if len(content) < 100:
            log(f"    [{label}] [WARN] Archivo muy pequeño ({len(content)} bytes) — probablemente no es el PDF real")
            return None

        FILES_DIR.mkdir(parents=True, exist_ok=True)
        save_path.write_bytes(content)
        rel_path = f"/data/files/{save_path.name}"
        log(f"    [{label}] [OK] Guardado en {save_path} → {rel_path}")
        return rel_path

    except Exception as e:
        log(f"    [{label}] [ERROR] Excepción al descargar recurso: {e}")
        try:
            await res_page.close()
        except Exception:
            pass
        return None


async def extract_resource_link(page, keywords: list[str], label: str) -> str | None:
    """
    Busca en la página un link cuyo texto coincida con los keywords dados.
    Devuelve el href o None.
    """
    links = await page.query_selector_all("a")
    for link in links:
        text = (await link.inner_text()).strip().lower()
        if text in keywords:
            href = await link.get_attribute("href") or ""
            if href:
                log(f"    [{label}] Link encontrado: texto='{text}' href={href}")
                return href
    log(f"    [{label}] [WARN] No se encontró ningún link con texto en {keywords}")
    return None


async def extract_programa(page, context, materia_nombre: str) -> str | None:
    """Busca el link 'Programa' y descarga el archivo. Retorna ruta relativa o None."""
    log("    → [PROGRAMA] Buscando...")
    href = await extract_resource_link(page, RESOURCE_KEYWORDS["programa"], "PROGRAMA")
    if not href:
        return None

    fname = safe_filename(materia_nombre)
    save_path = FILES_DIR / f"{fname}_programa.pdf"
    return await download_resource_file(context, href, save_path, "PROGRAMA")


async def extract_hoja_de_ruta(page, context, materia_nombre: str) -> str | None:
    """Busca el link 'Hoja de Ruta' y descarga el archivo. Retorna ruta relativa o None."""
    log("    → [HOJA_RUTA] Buscando...")
    href = await extract_resource_link(page, RESOURCE_KEYWORDS["hoja_de_ruta"], "HOJA_RUTA")
    if not href:
        return None

    fname = safe_filename(materia_nombre)
    save_path = FILES_DIR / f"{fname}_hoja_de_ruta.pdf"
    return await download_resource_file(context, href, save_path, "HOJA_RUTA")


# ─── Avisos ──────────────────────────────────────────────────────────────────

async def extract_avisos(page, context) -> list[dict]:
    """Encuentra foros de Avisos en la página del curso y extrae todos los mensajes."""
    avisos = []

    links = await page.query_selector_all("a")
    foro_urls = []
    for link in links:
        text = (await link.inner_text()).strip().lower()
        href = await link.get_attribute("href") or ""
        if "forum" in href and text in ("avisos", "avisos com a", "avisos com b", "avisos generales"):
            foro_urls.append((text, href))
            log(f"    [FORO] Encontrado: '{text}' → {href}")

    if not foro_urls:
        log("    [FORO] [WARN] No se encontraron foros de avisos en esta materia")

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

async def extract_sections(page, context, course_name: str) -> tuple[list[dict], list[dict]]:
    """
    Extrae unidades de contenido y actividades de las secciones del curso.
    Retorna (unidades, tareas_con_detalle)
    """
    unidades = []
    tareas_detalle = []

    section_links = await page.query_selector_all("a[href*='section.php']")
    log(f"    [SECCIONES] Encontradas: {len(section_links)}")

    if not section_links:
        log("    [SECCIONES] [WARN] No se encontraron secciones (a[href*='section.php'])")

    for sec_link in section_links:
        sec_text = (await sec_link.inner_text()).strip()
        sec_href = await sec_link.get_attribute("href") or ""
        if not sec_href:
            continue

        sec_lower = sec_text.lower()
        log(f"    [SECCION] '{sec_text}' → {sec_href}")

        is_actividad = any(k in sec_lower for k in SECCIONES_ACTIVIDAD)
        is_contenido = any(k in sec_lower for k in SECCIONES_CONTENIDO) or \
                       course_name.lower().split()[0] in sec_lower

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

    return unidades, tareas_detalle


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

    # Programa y Hoja de Ruta
    result["programa_archivo"]     = await extract_programa(page, page.context, course["nombre"])
    result["hoja_de_ruta_archivo"] = await extract_hoja_de_ruta(page, page.context, course["nombre"])

    # Avisos
    result["avisos"] = await extract_avisos(page, page.context)

    # Secciones (unidades + actividades enriquecidas)
    unidades, tareas_detalle = await extract_sections(page, page.context, course["nombre"])
    result["unidades"] = unidades
    if tareas_detalle:
        log(f"  [INFO] Reemplazando tareas básicas ({len(result['tareas'])}) con tareas enriquecidas ({len(tareas_detalle)})")
        result["tareas"] = tareas_detalle

    # Fechas para tareas sin fecha (fallback)
    sin_fecha = [t for t in result["tareas"] if not t.get("fecha_entrega")]
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

    log(f"\n  ── Resumen {course['nombre']} ──")
    log(f"     Tareas:        {len(result['tareas'])}")
    log(f"     Materiales:    {len(result['materiales'])}")
    log(f"     Unidades:      {len(result['unidades'])}")
    log(f"     Avisos:        {len(result['avisos'])}")
    log(f"     Programa:      {'✓ ' + result['programa_archivo'] if result['programa_archivo'] else '✗ no encontrado'}")
    log(f"     Hoja de Ruta:  {'✓ ' + result['hoja_de_ruta_archivo'] if result['hoja_de_ruta_archivo'] else '✗ no encontrada'}")

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
        "programa_archivo":    None,   # ruta relativa al PDF (/data/files/...)
        "hoja_de_ruta_archivo": None,  # ruta relativa al PDF (/data/files/...)
        "ultima_actualizacion": datetime.now().isoformat(),
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

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

    # ── Resumen final ────────────────────────────────────────────────────────
    COL = 32  # ancho columna nombre
    log(f"\n{'═'*72}")
    log(f"  RESUMEN FINAL — {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    log(f"{'═'*72}")
    log(f"  {'MATERIA':<{COL}} {'AVI':>3} {'TAR':>3} {'UNI':>3} {'MAT':>3}  {'PROG':>6}  {'RUTA':>6}")
    log(f"  {'─'*COL} {'───':>3} {'───':>3} {'───':>3} {'───':>3}  {'──────':>6}  {'──────':>6}")

    errores = []
    for m in materias_data:
        prog = "✓" if m.get("programa_archivo") else "✗"
        ruta = "✓" if m.get("hoja_de_ruta_archivo") else "✗"
        nombre = m["nombre"][:COL]
        avi = len(m.get("avisos", []))
        tar = len(m.get("tareas", []))
        uni = len(m.get("unidades", []))
        mat = len(m.get("materiales", []))
        log(f"  {nombre:<{COL}} {avi:>3} {tar:>3} {uni:>3} {mat:>3}  {prog:>6}  {ruta:>6}")

        # Acumular problemas para mostrarlos abajo
        if prog == "✗":
            errores.append(f"    ✗ Programa no encontrado:      {m['nombre']}")
        if ruta == "✗":
            errores.append(f"    ✗ Hoja de Ruta no encontrada:  {m['nombre']}")
        if uni == 0:
            errores.append(f"    ✗ Sin unidades extraídas:      {m['nombre']}")
        if tar == 0:
            errores.append(f"    ✗ Sin tareas encontradas:      {m['nombre']}")
        if avi == 0:
            errores.append(f"    ✗ Sin avisos encontrados:      {m['nombre']}")

    log(f"  {'─'*COL} {'───':>3} {'───':>3} {'───':>3} {'───':>3}  {'──────':>6}  {'──────':>6}")
    totales = {
        "avisos":    sum(len(m.get("avisos", []))    for m in materias_data),
        "tareas":    sum(len(m.get("tareas", []))    for m in materias_data),
        "unidades":  sum(len(m.get("unidades", []))  for m in materias_data),
        "materiales":sum(len(m.get("materiales", []))for m in materias_data),
        "programas": sum(1 for m in materias_data if m.get("programa_archivo")),
        "rutas":     sum(1 for m in materias_data if m.get("hoja_de_ruta_archivo")),
    }
    log(f"  {'TOTALES':<{COL}} {totales['avisos']:>3} {totales['tareas']:>3} {totales['unidades']:>3} {totales['materiales']:>3}  {totales['programas']:>5}✓  {totales['rutas']:>5}✓")
    log(f"\n  Leyenda: AVI=avisos  TAR=tareas  UNI=unidades  MAT=materiales  PROG=programa  RUTA=hoja de ruta")

    if errores:
        log(f"\n  ⚠ Lo que NO se pudo extraer ({len(errores)} problemas):")
        for e in errores:
            log(e)
    else:
        log(f"\n  ✅ Todo extraído correctamente en todas las materias")

    archivos_pdf = list(FILES_DIR.glob("*.pdf")) if FILES_DIR.exists() else []
    log(f"\n  PDFs descargados: {len(archivos_pdf)}")
    for f in archivos_pdf:
        log(f"    ✓ {f.name}  ({f.stat().st_size:,} bytes)")

    log(f"\n  ✅ JSON guardado: {OUTPUT_PATH}")
    log(f"{'═'*72}")


if __name__ == "__main__":
    asyncio.run(main())
