function openVideoModal() {
    console.log('openVideoModal called');
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    if (modal && video) {
        modal.style.display = 'flex';
        video.play().catch(error => {
            console.error('Error playing video:', error);
        });
    } else {
        console.error('Modal or video element not found');
    }
}

function closeVideoModal() {
    console.log('closeVideoModal called');
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('modalVideo');
    if (modal && video) {
        video.pause();
        video.currentTime = 0;
        modal.style.display = 'none';
    } else {
        console.error('Modal or video element not found');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const playButton = document.getElementById('playButton');
    const closeModalButton = document.getElementById('closeModal');
    const video = document.getElementById('modalVideo');

    if (playButton) {
        playButton.addEventListener('click', (event) => {
            event.stopPropagation();
            openVideoModal();
        });
    } else {
        console.error('Play button not found');
    }

    if (closeModalButton) {
        closeModalButton.addEventListener('click', (event) => {
            event.stopPropagation();
            closeVideoModal();
        });

        closeModalButton.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.stopPropagation();
                closeVideoModal();
            }
        });
    } else {
        console.error('Close modal button not found');
    }

    if (video) {
        video.addEventListener('click', (event) => {
            event.stopPropagation();
        });
    } else {
        console.error('Video element not found');
    }
});