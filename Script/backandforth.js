document.addEventListener('DOMContentLoaded', () => {
    const categories = ['pfp', 'gaming', 'art', 'hot-collection'];
    let currentIndex = 0;

    const showCategory = (index) => {
        // Hide all containers
        document.querySelectorAll('.pfp-container').forEach(container => {
            container.style.display = 'none';
        });
        // Show the current category container
        document.querySelector(`.pfp-container[data-category="${categories[index]}"]`).style.display = 'block';
    };

    // Initialize by showing the first category
    showCategory(currentIndex);

    // Event listeners for navigation buttons
    document.querySelectorAll('.nav-icon.back').forEach(button => {
        button.addEventListener('click', () => {
            currentIndex = (currentIndex - 1 + categories.length) % categories.length;
            showCategory(currentIndex);
        });
    });

    document.querySelectorAll('.nav-icon.forth').forEach(button => {
        button.addEventListener('click', () => {
            currentIndex = (currentIndex + 1) % categories.length;
            showCategory(currentIndex);
        });
    });
});