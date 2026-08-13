from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('privacy-policy/', views.privacy_policy, name='privacy_policy'),
    path('terms-of-service/', views.terms_of_service, name='terms_of_service'),
    path('about/', views.about, name='about'),
    path('404/', views.custom_404, name='custom_404'),
    path('500/', views.custom_500, name='custom_500'),
    path('sitemap.xml', views.sitemap_xml, name='sitemap_xml'),
    path('robots.txt', views.robots_txt, name='robots_txt'),
    path('api/generate/', views.generate_tts, name='generate_tts'),
    path('api/download/<str:filename>/', views.download_audio, name='download_audio'),
]





