from django.db import models
import os

class TTSConversion(models.Model):
    text = models.TextField()
    language = models.CharField(max_length=10, default='en')
    language_name = models.CharField(max_length=50, default='English')
    slow = models.BooleanField(default=False)
    audio_file = models.FileField(upload_to='audio/')
    file_size = models.CharField(max_length=20, default='0 KB')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.language_name} ({'Slow' if self.slow else 'Normal'}): {self.text[:30]}..."

    def delete(self, *args, **kwargs):
        # Delete audio file from storage when object is deleted
        if self.audio_file and os.path.isfile(self.audio_file.path):
            os.remove(self.audio_file.path)
        super().delete(*args, **kwargs)

