/* Reliable, accessible hamburger navigation for all five Finder pages. */
(() => {
  "use strict";

  function initFinderMobileNav() {
    document.querySelectorAll(".navbar").forEach((navbar) => {
      const menuBtn = navbar.querySelector("#menuBtn");
      const navLinks = navbar.querySelector("#navLinks");
      if (!menuBtn || !navLinks || menuBtn.dataset.finderNavReady === "true") return;

      menuBtn.dataset.finderNavReady = "true";

      const setOpen = (open) => {
        navLinks.classList.toggle("show", open);
        menuBtn.setAttribute("aria-expanded", String(open));
        menuBtn.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
        menuBtn.innerHTML = open
          ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
          : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
      };

      // Capture the tap before legacy inline handlers so the menu toggles exactly once.
      menuBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        setOpen(menuBtn.getAttribute("aria-expanded") !== "true");
      }, true);

      navLinks.addEventListener("click", (event) => {
        if (event.target.closest("a")) setOpen(false);
      });

      document.addEventListener("click", (event) => {
        if (menuBtn.getAttribute("aria-expanded") === "true" && !navbar.contains(event.target)) {
          setOpen(false);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
          setOpen(false);
          menuBtn.focus();
        }
      });

      window.addEventListener("resize", () => {
        if (window.innerWidth > 1100) setOpen(false);
      }, { passive: true });

      setOpen(false);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFinderMobileNav, { once: true });
  } else {
    initFinderMobileNav();
  }
})();
