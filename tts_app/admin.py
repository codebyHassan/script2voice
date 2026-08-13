from django.contrib import admin
from django.utils.html import format_html
from .models import TTSConversion

@admin.register(TTSConversion)
class TTSConversionAdmin(admin.ModelAdmin):
    list_display = ('id', 'language_name', 'short_text', 'file_size', 'created_at', 'audio_player_widget')
    list_filter = ('language', 'slow', 'created_at')
    search_fields = ('text', 'language_name')
    readonly_fields = ('created_at', 'file_size', 'audio_player_widget')

    def short_text(self, obj):
        if len(obj.text) > 40:
            return obj.text[:40] + '...'
        return obj.text
    short_text.short_description = 'Text Content'

    def audio_player_widget(self, obj):
        if obj.audio_file:
            return format_html(
                '<audio controls style="height: 30px; max-width: 220px;">'
                '<source src="{}" type="audio/mpeg">'
                'Your browser does not support the audio element.'
                '</audio>',
                obj.audio_file.url
            )
        return "No File"
    audio_player_widget.short_description = 'Audio Playback'

