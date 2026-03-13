document.addEventListener('DOMContentLoaded', () => {
    // Select the Trading and NFT buttons
    const tradingButton = document.querySelector('.toggle_button_group .toggle_button:nth-child(1)');
    const nftButton = document.querySelector('.toggle_button_group .toggle_button:nth-child(2)');
    const logoButton = document.querySelector('.logo_image');

    // Set active class based on current page
    const currentPath = window.location.pathname.toLowerCase();
    if (currentPath.endsWith('nft.html')) {
        if (tradingButton) tradingButton.classList.remove('active');
        if (nftButton) nftButton.classList.add('active');
    } else {
        if (tradingButton) tradingButton.classList.add('active');
        if (nftButton) nftButton.classList.remove('active');
    }

    // Add click event listener to Trading button
    if (tradingButton) {
        tradingButton.addEventListener('click', () => {
            // Remove active class from NFT button
            if (nftButton) {
                nftButton.classList.remove('active');
            }
            // Add active class to Trading button
            tradingButton.classList.add('active');
            //redirect to home.html
            window.location.href = 'home.html';
        });
    }

    // Add click event listener to NFT button
    if (nftButton) {
        nftButton.addEventListener('click', () => {
            // Remove active class from Trading button
            if (tradingButton) {
                tradingButton.classList.remove('active');
            }
            // Add active class to NFT button
            nftButton.classList.add('active');
            // Redirect to nft.html
            window.location.href = 'nft.html';
        });
    }

    if (logoButton) {
        logoButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});