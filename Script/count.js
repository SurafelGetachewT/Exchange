document.addEventListener('DOMContentLoaded', () => {
    // Function to format numbers with commas
    function formatNumber(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    // Function to animate the counter
    function animateCounter(element, start, end, duration) {
        let startTime = null;

        function updateCounter(currentTime) {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = formatNumber(current);
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = formatNumber(end); // Ensure final value is exact
            }
        }

        requestAnimationFrame(updateCounter);
    }

    // Select all .value elements
    const valueElements = document.querySelectorAll('.donation-item .value');
    const donateSection = document.querySelector('.donate');

    // Intersection Observer to trigger animation when section is visible
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                valueElements.forEach(element => {
                    const targetValue = parseInt(element.textContent.replace(/,/g, ''), 10);
                    animateCounter(element, 0, targetValue, 2000); // 2000ms = 2 seconds
                });
                observer.unobserve(donateSection); // Stop observing after animation
            }
        });
    }, { threshold: 0.5 }); // Trigger when 50% of the section is visible

    // Start observing the donate section
    if (donateSection) {
        observer.observe(donateSection);
    }
});