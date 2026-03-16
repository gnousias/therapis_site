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
// function applyLanguage(lang) {
//     // Update text elements
//     document.querySelectorAll('[data-en]').forEach(el => {
//         const translation = el.getAttribute('data-' + lang);
//         if (el.childNodes[0] && el.childNodes[0].nodeType === 3) {
//             el.childNodes[0].textContent = translation;
//         } else {
//             el.textContent = translation;
//         }
//     });

//     // Update form placeholders
//     document.querySelectorAll('[data-en-ph]').forEach(el => {
//         el.placeholder = el.getAttribute('data-' + lang + '-ph');
//     });
// }

function applyLanguage(lang) {
    // 1. Update text elements and handle HTML (links, icons)
    document.querySelectorAll('[data-en]').forEach(el => {
        const translation = el.getAttribute('data-' + lang);
        
        // Check if there is an icon (FontAwesome <i> tag) inside
        const icon = el.querySelector('i');
        
        if (icon) {
            // Preserve the icon and add the translated text after it
            // We use .innerHTML here so it renders the <i> tag correctly
            el.innerHTML = ''; // Clear current content
            el.appendChild(icon); // Put the icon back
            el.innerHTML += ' ' + translation; // Add the text
        } else {
            // No icon? Use innerHTML to allow <a> tags for links in bios
            el.innerHTML = translation;
        }
    });

    // 2. Update form placeholders (No change needed here)
    document.querySelectorAll('[data-en-ph]').forEach(el => {
        const placeholderText = el.getAttribute('data-' + lang + '-ph');
        if (placeholderText) {
            el.placeholder = placeholderText;
        }
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

window.scrollToBio = function(targetId) {
    // If we're going back to team, we use the grid ID
    const target = targetId === 'team-selection' ? 
                   document.querySelector('.team-selection-grid') : 
                   document.getElementById(targetId);

    if (target) {
        const headerOffset = 120; // Matches your sticky header height
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }
};

// Mobile Menu Toggle (Must be global for the onclick="" in the header)
window.toggleMobileMenu = function() {
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('active');
};

window.toggleBio = function(button) {
    const card = button.closest('.bio-card');
    const fullContent = card.querySelector('.full-bio-content');
    const shortText = card.querySelector('.bio-text');
    const isExpanded = fullContent.style.display === 'block';

    if (isExpanded) {
        fullContent.style.display = 'none';
        shortText.style.display = 'block';
        button.setAttribute('data-en', 'More ->');
        button.setAttribute('data-el', 'Περισσότερα ->');
    } else {
        fullContent.style.display = 'block';
        shortText.style.display = 'none';
        button.setAttribute('data-en', '<- Less');
        button.setAttribute('data-el', '<- Λιγότερα');
    }
    
    // Re-apply language to the button text immediately
    applyLanguage(localStorage.getItem('selectedLanguage') || 'en');
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