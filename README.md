# Pusula eğitim platformu

Misafir veya öğrenci hesabıyla modüler eğitimleri tamamlayabilir, ilerlemeni kaydedebilirsin. Yönetici hesabıyla içerik stüdyosunda ders, video, soru, vaka ve anket bloklarını bağlayıp yayımlayabilirsin.

## Yerel kurulum

Node.js 24.12 veya üzeri ile aşağıdaki komutları çalıştır.

```sh
cd platform-app
npm start
```

Tarayıcıda http://127.0.0.1:3000 adresini aç. İlk yerel çalıştırmada yönetici bilgileri `platform-app/data/ilk-giris.txt` içine yazılır. Uygulama Node.js ve SQLite kullanır. Testleri aynı klasörde `npm test` ile çalıştırabilirsin.

## Eğitimler ve medya

Excel iş laboratuvarında üç rol, her modül için sekiz soruluk ön test ve hücrelerde formül uygulamaları bulunur. Altı doğru yapan öğrenci ilgili modülü atlayabilir. Kurumsal akademi eğitiminde video karar durakları ve eğitmen değerlendirmesi yer alır.

Kaynak sürümü videoları ve ses kayıtlarını içermez. Kendi MP4 dosyalarını `platform-app/public/assets/` içine `egitim.mp4`, `akademi-01.mp4` ve `akademi-02.mp4` adlarıyla koyabilir veya içerik stüdyosundan video yükleyebilirsin. Video bulunmadığında ders notlarından sonraki adıma geçilebilir. Medya oynatımını sınayan isteğe bağlı tarayıcı testleri ilgili videoları gerektirir.

Kökteki Python betikleri eğitim videolarının üretim kaynaklarıdır. Bunlar platformu çalıştırmak için gerekli değildir. Yeniden üretim için betiklerde belirtilen kaynak görseller, ses girdileri, Python paketleri ve FFmpeg gerekir. Render edilen çıktı ve model dosyaları yerel kalır.
