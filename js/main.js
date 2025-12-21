// بارگذاری particles.js
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("particles-js")) {
        particlesJS("particles-js", {
            particles: {
                number: { value: 100 },
                color: { value: ["#4cc9f0", "#8b5cf6", "#7209b7"] },
                shape: { type: "circle" },
                opacity: { value: 0.6, random: true },
                size: { value: 3, random: true },
                line_linked: {
                    enable: true,
                    distance: 140,
                    color: "#6366f1",
                    opacity: 0.3,
                    width: 1
                },
                move: { enable: true, speed: 1.5 }
            },
            interactivity: {
                events: { onhover: { enable: true, mode: "repulse" } }
            }
        });
    }

    // بارگذاری زبان از localStorage یا پیش‌فرض فارسی
    const savedLang = localStorage.getItem("language") || "fa";
    setLanguage(savedLang);
});

// تابع تغییر زبان
async function setLanguage(lang) {
    try {
        const response = await fetch(`lang/${lang}.json`);
        const texts = await response.json();

        // بروزرسانی title
        document.title = texts.site_title;

        // بروزرسانی تمام المنت‌ها با data-key
        document.querySelectorAll("[data-key]").forEach(el => {
            const key = el.dataset.key;
            if (texts[key]) {
                el.innerHTML = texts[key];
            }
        });

        // بروزرسانی direction و lang
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
        document.body.classList.toggle("en", lang === "en");

        // بروزرسانی دکمه‌های زبان
        document.querySelectorAll(".lang-switch button").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.lang === lang);
        });

        // ذخیره در localStorage
        localStorage.setItem("language", lang);

    } catch (err) {
        console.error("خطا در بارگذاری فایل زبان:", err);
    }
}
