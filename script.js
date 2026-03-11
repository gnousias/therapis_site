/**
 * THERAPIS PHYSIO CENTER - Centralized Logic
 * Handles Component Loading, Multi-language Support, and Interactive UI
 */

// --- 1. CONFIGURATION & STATE ---
let currentLang = localStorage.getItem('selectedLanguage') || 'en';

// --- 2. COMPONENT LOADER ---
// Fetches HTML files and injects them into placeholders
async function loadComponent(id, file) {
    try {
        const response = await fetch(file);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.text();
        document.getElementById(id).innerHTML = data;
    } catch (error) {
        console.error('Error loading ' + file, error);
    }
}

// --- 3. LANGUAGE LOGIC ---
function applyLanguage(lang) {
    // Update text elements
    document.querySelectorAll('[data-en]').forEach(el => {
        const translation = el.getAttribute('data-' + lang);
        if (el.childNodes[0] && el.childNodes[0].nodeType === 3) {
            el.childNodes[0].textContent = translation;
        } else {
            el.textContent = translation;
        }
    });

    // Update form placeholders
    document.querySelectorAll('[data-en-ph]').forEach(el => {
        el.placeholder = el.getAttribute('data-' + lang + '-ph');
    });
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'el' : 'en';
    localStorage.setItem('selectedLanguage', currentLang);
    applyLanguage(currentLang);
}

// --- 4. UI INTERACTIVITY ---
function initInteractions() {
    // FAQ Toggle Logic
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== item) otherItem.classList.remove('active');
            });
            item.classList.toggle('active');
        });
    });
}

// Mobile Menu Toggle (Must be global for the onclick="" in the header)
window.toggleMobileMenu = function() {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('active');
};

// --- 5. INITIALIZATION ---
// This runs once the page shell is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Step A: Load external components
    await Promise.all([
        loadComponent("header-placeholder", "header.html"),
        loadComponent("footer-placeholder", "footer.html")
    ]);

    // Step B: Apply language to everything (including the header/footer)
    applyLanguage(currentLang);

    // Step C: Initialize FAQ/Button listeners
    initInteractions();
});