/**
 * THERAPIS PHYSIO CENTER - Centralized Logic
 * Handles Component Loading, Multi-language Support, and Interactive UI
 */

// --- 1. CONFIGURATION & STATE ---
let currentLang = localStorage.getItem('selectedLanguage') || 'en';

// --- 2. COMPONENT LOADER ---
// Fetches HTML files and injects them into placeholders
// async function loadComponent(id, file) {
//     try {
//         const response = await fetch(file);
//         if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//         const data = await response.text();
//         document.getElementById(id).innerHTML = data;
//     } catch (error) {
//         console.error('Error loading ' + file, error);
//     }
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
    highlightBrandName("Therapis");
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

// Mobile view start
function initMobileMenu() {
    const menuToggle = document.getElementById('mobile-menu');
    const mainNav = document.getElementById('mainNav');
    if (!menuToggle || !mainNav) return;

    // 1. Manage Mobile Contact Button
    function handleMobileButton() {
        let wrapper = mainNav.querySelector('.mobile-wrapper');
        
        if (window.innerWidth <= 768) {
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.className = 'mobile-wrapper';
                
                // 1. Create Language Toggle for Mobile
                const langNode = document.createElement('div');
                langNode.className = 'mobile-lang-toggle';
                langNode.innerHTML = 'EN | GR';
                langNode.onclick = () => { 
                    if(typeof toggleLanguage === 'function') {
                        toggleLanguage(); 
                        // Force update the text of the injected button immediately
                        updateMobileButtonText();
                    }
                };

                // 2. Create Contact Button with translation attributes
                const contactBtn = document.createElement('a');
                contactBtn.href = "contact_us.html";
                contactBtn.className = 'btn-mobile-contact';
                // Set initial text
                contactBtn.textContent = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'Contact us' : 'Επικοινωνία';
                // Add attributes so applyLanguage() can find it later
                contactBtn.setAttribute('data-en', 'Contact us');
                contactBtn.setAttribute('data-el', 'Επικοινωνία');
                
                wrapper.appendChild(langNode);
                wrapper.appendChild(contactBtn);
                mainNav.appendChild(wrapper);
            }
        } else {
            // DESKTOP CLEANUP: Remove mobile clones so they don't appear in desktop menu
            if (wrapper) wrapper.remove();
            // Ensure body scroll is restored if window is resized while menu open
            document.body.style.overflow = '';
        }
    }

    // Helper to refresh the button text specifically
    function updateMobileButtonText() {
        const btn = mainNav.querySelector('.btn-mobile-contact');
        if (btn && typeof currentLang !== 'undefined') {
            btn.textContent = (currentLang === 'en') ? btn.getAttribute('data-en') : btn.getAttribute('data-el');
        }
    }

    // 2. Hamburger Toggle
    menuToggle.onclick = function(e) {
        e.stopPropagation();
        this.classList.toggle('is-active');
        mainNav.classList.toggle('active');
        document.body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
    };

    // 3. Accordion Logic
    const dropdownLinks = mainNav.querySelectorAll('.has-dropdown > a');
    dropdownLinks.forEach(link => {
        link.onclick = function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                const parent = this.parentElement;
                // Close others
                dropdownLinks.forEach(other => {
                    if (other.parentElement !== parent) other.parentElement.classList.remove('open');
                });
                parent.classList.toggle('open');
            }
        };
    });

    // Initial check and resize listener
    handleMobileButton();
    window.addEventListener('resize', handleMobileButton);
}

// Mobile view end

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
    // await Promise.all([
    //     loadComponent("header-placeholder", "header.html"),
    //     loadComponent("footer-placeholder", "footer.html")
    // ]);

    // Step B: Apply language to everything (including the header/footer)
    applyLanguage(currentLang);

    // Step C: Initialize FAQ/Button listeners
    initInteractions();
    initMobileMenu();
    highlightBrandName("Therapis");
});

function highlightBrandName(word) {
    // 1. Find all text nodes in the document body
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    const textNodes = [];

    // 2. Filter out scripts, styles, and existing brand-word spans to avoid loops
    while (node = walker.nextNode()) {
        const parent = node.parentElement;
        const parentTag = node.parentElement.tagName;
        if (node.nodeValue.includes(word) && 
            parentTag !== 'SCRIPT' && 
            parentTag !== 'STYLE' && 
            !parentTag.startsWith('H') && 
            parentTag !== 'NAV' && 
            !parent.closest('nav') && 
            !parent.closest('#mainNav') && 
            !parent.classList.contains('brand-word')) {
            textNodes.push(node);
        }
    }

    // 3. Replace text with styled spans
    textNodes.forEach(textNode => {
        const parent = textNode.parentElement;
        const regex = new RegExp(`\\b(${word})\\b`, 'gi'); 
        const parts = textNode.nodeValue.split(regex);
        const fragment = document.createDocumentFragment();
        
        parts.forEach(part => {
            if (part.toLowerCase() === word.toLowerCase()) {
                const span = document.createElement('span');
                span.className = 'brand-word'; // The new class
                span.textContent = part;
                fragment.appendChild(span);
            } else if (part !== "") {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        parent.replaceChild(fragment, textNode);
    });
}