import os
import uuid
import json
import re
import asyncio
from django.shortcuts import render

from django.http import JsonResponse, FileResponse, Http404, HttpResponse



from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from django.conf import settings
import edge_tts
from gtts import gTTS
from .models import TTSConversion

def clean_text_for_speech(text):
    """Strips markdown heading tags (###), time stamps (0:00–0:04), and bold formatting before audio synthesis."""
    if not text:
        return ""
    cleaned = text
    # 1. Remove heading lines with timestamps, e.g. "### 0:00–0:04 — Open Login"
    cleaned = re.sub(r'(?m)^#+.*$', '', cleaned)
    cleaned = re.sub(r'(?m)^\d{1,2}:\d{2}\s*[\-–—]\s*\d{1,2}:\d{2}.*$', '', cleaned)
    # 2. Remove inline timestamp markers like "0:00–0:04", "0:04-0:08", "[0:15]"
    cleaned = re.sub(r'\b\d{1,2}:\d{2}\s*[\-–—]\s*\d{1,2}:\d{2}\b', '', cleaned)
    cleaned = re.sub(r'\[?\b\d{1,2}:\d{2}\b\]?', '', cleaned)
    # 3. Remove bold & italics
    cleaned = re.sub(r'\*\*(.*?)\*\*', r'\1', cleaned)
    cleaned = re.sub(r'\*(.*?)\*', r'\1', cleaned)
    cleaned = re.sub(r'__(.*?)__', r'\1', cleaned)
    cleaned = re.sub(r'_(.*?)_', r'\1', cleaned)
    # 4. Remove leading dashes, bullet points or em-dashes
    cleaned = re.sub(r'(?m)^[–—\-\*•]+\s*', '', cleaned)
    # 5. Reduce multiple blank lines into clean paragraph spacing
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()
    return cleaned


# Voice Tones & Accents Catalog (100% Free - Edge Neural Voices + gTTS)
VOICES = {
    # US English Female Tones
    'en-US-JennyNeural': {'name': '🎙️ Jenny — US Female (Natural & Clear)', 'type': 'edge', 'lang': 'en'},
    'en-US-AriaNeural': {'name': '🎙️ Aria — US Female (Expressive & Upbeat)', 'type': 'edge', 'lang': 'en'},
    'en-US-AnaNeural': {'name': '👧 Ana — US Female (Young / Cute Tone)', 'type': 'edge', 'lang': 'en'},
    'en-US-MichelleNeural': {'name': '🎙️ Michelle — US Female (News Anchor)', 'type': 'edge', 'lang': 'en'},
    
    # US English Male Tones
    'en-US-GuyNeural': {'name': '🎙️ Guy — US Male (Natural Neutral)', 'type': 'edge', 'lang': 'en'},
    'en-US-ChristopherNeural': {'name': '🎙️ Christopher — US Male (Deep & Authoritative)', 'type': 'edge', 'lang': 'en'},
    'en-US-EricNeural': {'name': '🎙️ Eric — US Male (Casual & Friendly)', 'type': 'edge', 'lang': 'en'},
    'en-US-RogerNeural': {'name': '🎙️ Roger — US Male (Narrator / Storyteller)', 'type': 'edge', 'lang': 'en'},

    # British UK Accents & Tones
    'en-GB-SoniaNeural': {'name': '🇬🇧 Sonia — UK British Female (Warm)', 'type': 'edge', 'lang': 'en'},
    'en-GB-RyanNeural': {'name': '🇬🇧 Ryan — UK British Male (Formal)', 'type': 'edge', 'lang': 'en'},

    # Australian & Indian English Accents
    'en-AU-NatashaNeural': {'name': '🇦🇺 Natasha — Australian Female', 'type': 'edge', 'lang': 'en'},
    'en-AU-WilliamNeural': {'name': '🇦🇺 William — Australian Male', 'type': 'edge', 'lang': 'en'},
    'en-IN-NeerjaNeural': {'name': '🇮🇳 Neerja — Indian English Female', 'type': 'edge', 'lang': 'en'},
    'en-IN-PrabhatNeural': {'name': '🇮🇳 Prabhat — Indian English Male', 'type': 'edge', 'lang': 'en'},

    # Hindi & South Asian
    'hi-IN-SwaraNeural': {'name': '🇮🇳 Swara — Hindi Female (India)', 'type': 'edge', 'lang': 'hi'},
    'hi-IN-MadhurNeural': {'name': '🇮🇳 Madhur — Hindi Male (India)', 'type': 'edge', 'lang': 'hi'},

    # European Voices
    'es-ES-ElviraNeural': {'name': '🇪🇸 Elvira — Spanish Female', 'type': 'edge', 'lang': 'es'},
    'es-ES-AlvaroNeural': {'name': '🇪🇸 Alvaro — Spanish Male', 'type': 'edge', 'lang': 'es'},
    'fr-FR-DeniseNeural': {'name': '🇫🇷 Denise — French Female', 'type': 'edge', 'lang': 'fr'},
    'fr-FR-HenriNeural': {'name': '🇫🇷 Henri — French Male', 'type': 'edge', 'lang': 'fr'},
    'de-DE-KatjaNeural': {'name': '🇩🇪 Katja — German Female', 'type': 'edge', 'lang': 'de'},
    'de-DE-ConradNeural': {'name': '🇩🇪 Conrad — German Male', 'type': 'edge', 'lang': 'de'},

    # Asian & Arabic Voices
    'ja-JP-NanamiNeural': {'name': '🇯🇵 Nanami — Japanese Female', 'type': 'edge', 'lang': 'ja'},
    'ja-JP-KeitaNeural': {'name': '🇯🇵 Keita — Japanese Male', 'type': 'edge', 'lang': 'ja'},
    'zh-CN-XiaoxiaoNeural': {'name': '🇨🇳 Xiaoxiao — Chinese Female', 'type': 'edge', 'lang': 'zh-CN'},
    'ar-EG-SalmaNeural': {'name': '🇦🇪 Salma — Arabic Female', 'type': 'edge', 'lang': 'ar'},

    # Classic Google gTTS Accents
    'gtts-en-us': {'name': '🌐 Google gTTS — US Accent', 'type': 'gtts', 'lang': 'en', 'tld': 'com'},
    'gtts-en-uk': {'name': '🌐 Google gTTS — UK British Accent', 'type': 'gtts', 'lang': 'en', 'tld': 'co.uk'},
    'gtts-en-in': {'name': '🌐 Google gTTS — Indian Accent', 'type': 'gtts', 'lang': 'en', 'tld': 'co.in'},
    'gtts-en-au': {'name': '🌐 Google gTTS — Australian Accent', 'type': 'gtts', 'lang': 'en', 'tld': 'com.au'},
}

# Pitch / Tone Variations
PITCH_OPTIONS = {
    '+0Hz': 'Natural Pitch (Standard)',
    '+15Hz': 'Bright / Animated (+15Hz)',
    '+30Hz': 'Cute / Toon Tone (+30Hz)',
    '-15Hz': 'Deep Tone (-15Hz)',
    '-30Hz': 'Extra Deep / Monster (-30Hz)',
}

# Speech Rate / Duration Adjustment Options
RATE_OPTIONS = {
    '+0%': '1.00x Normal Pace (Standard 150 WPM)',
    '+5%': '1.05x Slight Boost (Natural lively)',
    '+10%': '1.10x Pace (Fit ~2.5 min video)',
    '+15%': '1.15x Quick Pace (Fit ~2.0 min video)',
    '+20%': '1.20x Pace (Fit ~1.75 min video)',
    '+25%': '1.25x Fast Pace (Fit ~1.5 min video)',
    '+35%': '1.35x Fast Pace (Fit ~1.0 min video)',
    '+50%': '1.50x High Speed (Fit ~45 sec Reel/Short)',
    '+75%': '1.75x Ultra Speed (Fit ~30 sec Ad)',
    '+100%': '2.00x Double Speed (Rapid fire)',
    '-5%': '0.95x Relaxed Pace',
    '-10%': '0.90x Relaxed Narration',
    '-15%': '0.85x Storytelling Slow Pace',
    '-20%': '0.80x Slow & Clear Pace',
    '-25%': '0.75x Slow Pace (Stretch to fit longer slot)',
    '-35%': '0.65x Extra Slow Pace',
    '-50%': '0.50x Half Speed (Educational / Dictation)',
}


@ensure_csrf_cookie
def index(request):
    """Render main web application interface."""
    return render(request, 'index.html', {
        'voices': VOICES,
        'pitch_options': PITCH_OPTIONS,
        'rate_options': RATE_OPTIONS
    })

def privacy_policy(request):
    """Render Privacy Policy page for GDPR, CCPA, and Google AdSense compliance."""
    return render(request, 'privacy_policy.html')

def terms_of_service(request):
    """Render Terms of Service & Commercial Rights page."""
    return render(request, 'terms.html')

def about(request):
    """Render About Us & Tool Details page."""
    return render(request, 'about.html')

def sitemap_xml(request):
    """Generate dynamic XML Sitemap for Google Search Console & SEO Crawlers."""
    host = request.build_absolute_uri('/')[:-1]
    lastmod = datetime.now().strftime('%Y-%m-%d')
    
    urls = [
        {'loc': f'{host}/', 'priority': '1.0', 'changefreq': 'daily'},
        {'loc': f'{host}/about/', 'priority': '0.8', 'changefreq': 'weekly'},
        {'loc': f'{host}/privacy-policy/', 'priority': '0.5', 'changefreq': 'monthly'},
        {'loc': f'{host}/terms-of-service/', 'priority': '0.5', 'changefreq': 'monthly'},
    ]
    
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in urls:
        xml_content += f'  <url>\n'
        xml_content += f'    <loc>{u["loc"]}</loc>\n'
        xml_content += f'    <lastmod>{lastmod}</lastmod>\n'
        xml_content += f'    <changefreq>{u["changefreq"]}</changefreq>\n'
        xml_content += f'    <priority>{u["priority"]}</priority>\n'
        xml_content += f'  </url>\n'
    xml_content += '</urlset>'
    
    return HttpResponse(xml_content, content_type='application/xml')

def robots_txt(request):
    """Generate robots.txt file for Search Engine Crawlers."""
    host = request.build_absolute_uri('/')[:-1]
    content = f"User-agent: *\nAllow: /\n\nSitemap: {host}/sitemap.xml\n"
    return HttpResponse(content, content_type='text/plain')



async def _generate_edge_tts(text, voice_code, pitch_setting, rate_setting, filepath):
    """Async helper function to invoke Edge Neural TTS with pitch and rate controls."""
    communicate = edge_tts.Communicate(text=text, voice=voice_code, pitch=pitch_setting, rate=rate_setting)
    await communicate.save(filepath)

import time
from datetime import datetime

def clean_old_media_files(audio_dir, max_age_seconds=7200):
    """Deletes temporary audio files older than 2 hours to keep server storage clean."""
    try:
        if not os.path.exists(audio_dir):
            return
        current_time = time.time()
        for fname in os.listdir(audio_dir):
            fpath = os.path.join(audio_dir, fname)
            if os.path.isfile(fpath) and fname.endswith('.mp3'):
                if current_time - os.path.getmtime(fpath) > max_age_seconds:
                    try:
                        os.remove(fpath)
                    except Exception:
                        pass
    except Exception:
        pass

@require_http_methods(["POST"])
def generate_tts(request):

    """API endpoint to convert text to speech with voice tones, pitch, and duration rate control (Stateless - No DB)."""
    try:
        data = json.loads(request.body.decode('utf-8'))
    except Exception:
        data = request.POST

    raw_text = data.get('text', '').strip()
    voice_key = data.get('voice', 'en-US-JennyNeural')
    pitch_setting = data.get('pitch', '+0Hz')
    rate_setting = data.get('rate', '+0%')
    slow = bool(data.get('slow', False))

    if not raw_text:
        return JsonResponse({'status': 'error', 'message': 'Text content cannot be empty.'}, status=400)

    # Security check: Cap maximum input text length to 5000 characters to prevent DoS attacks
    if len(raw_text) > 5000:
        return JsonResponse({'status': 'error', 'message': 'Security Alert: Input text exceeds maximum allowed limit of 5000 characters.'}, status=400)

    # Clean text to strip ### 0:00-0:04 timestamp headers
    speech_text = clean_text_for_speech(raw_text)
    if not speech_text:
        speech_text = raw_text

    voice_info = VOICES.get(voice_key, VOICES['en-US-JennyNeural'])
    voice_name = voice_info['name']
    voice_type = voice_info.get('type', 'edge')

    # Ensure media/audio directory exists & trigger auto-clean of old media files (>2 hrs)
    audio_dir = os.path.join(settings.MEDIA_ROOT, 'audio')
    os.makedirs(audio_dir, exist_ok=True)
    clean_old_media_files(audio_dir)

    # Unique file name and record ID
    record_id = uuid.uuid4().hex[:10]
    filename = f"tts_{record_id}.mp3"
    filepath = os.path.join(audio_dir, filename)

    try:
        if voice_type == 'edge':
            # Edge Neural TTS generation
            asyncio.run(_generate_edge_tts(speech_text, voice_key, pitch_setting, rate_setting, filepath))
        else:
            # Google gTTS generation
            lang_code = voice_info.get('lang', 'en')
            tld_code = voice_info.get('tld', 'com')
            tts = gTTS(text=speech_text, lang=lang_code, tld=tld_code, slow=slow)
            tts.save(filepath)

        # File size calculation
        bytes_size = os.path.getsize(filepath)
        if bytes_size < 1024 * 1024:
            file_size_str = f"{round(bytes_size / 1024, 1)} KB"
        else:
            file_size_str = f"{round(bytes_size / (1024 * 1024), 2)} MB"

        display_label = f"{voice_name} ({pitch_setting})" if voice_type == 'edge' else voice_name
        media_url = f"/media/audio/{filename}"
        download_url = f"/api/download/{filename}/"

        return JsonResponse({
            'status': 'success',
            'data': {
                'id': record_id,
                'text': raw_text,
                'language': voice_key,
                'language_name': display_label,
                'slow': slow,
                'audio_url': media_url,
                'download_url': download_url,
                'file_size': file_size_str,
                'created_at': datetime.now().strftime('%b %d, %Y - %H:%M')
            }
        })

    except Exception as e:
        return JsonResponse({'status': 'error', 'message': 'Failed to generate audio stream.'}, status=500)



FILENAME_REGEX = re.compile(r'^[a-zA-Z0-9_\-]+\.mp3$')

@require_http_methods(["GET"])
def download_audio(request, filename):
    """API endpoint to force download of generated MP3 file with strict Path Traversal protection."""
    # 1. Sanitize filename against Directory Traversal attacks
    clean_filename = os.path.basename(filename)
    if clean_filename != filename or not FILENAME_REGEX.match(filename):
        return JsonResponse({'status': 'error', 'message': 'Security Alert: Invalid file path parameter.'}, status=400)

    audio_dir = os.path.abspath(os.path.join(settings.MEDIA_ROOT, 'audio'))
    filepath = os.path.abspath(os.path.join(audio_dir, clean_filename))

    # 2. Strict Boundary Verification: Ensure filepath is inside audio_dir
    if not filepath.startswith(audio_dir):
        return JsonResponse({'status': 'error', 'message': 'Access denied: Directory traversal detected.'}, status=403)

    if os.path.exists(filepath) and os.path.isfile(filepath):
        file_handle = open(filepath, 'rb')
        download_filename = f"speech_{clean_filename}"
        return FileResponse(
            file_handle,
            as_attachment=True,
            filename=download_filename,
            content_type='audio/mpeg'
        )
    return JsonResponse({'status': 'error', 'message': 'Audio file expired or not found on server disk.'}, status=404)

def custom_404(request, exception=None):
    """Custom 404 Page Not Found view."""
    return render(request, '404.html', status=404)

def custom_500(request):
    """Custom 500 Server Error view."""
    return render(request, '500.html', status=500)





