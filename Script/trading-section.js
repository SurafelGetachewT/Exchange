document.addEventListener('DOMContentLoaded', () => {
    updateCryptoData();
    setInterval(updateCryptoData, 10000); // Update every 10 seconds

    const star = document.getElementById('favorite-star');
    if (star) {
        star.addEventListener('click', () => {
            star.classList.toggle('active');
        });
    }
});

async function updateCryptoData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&locale=en&precision=2');
        const data = await response.json();
        const btc = data[0];

        const price = btc.current_price.toFixed(2);
        document.getElementById('price').innerText = price;
        document.getElementById('usd-price').innerText = `≈ $${price}`;

        const changePct = btc.price_change_percentage_24h.toFixed(4);
        const changeElement = document.getElementById('change');
        changeElement.innerText = `${changePct > 0 ? '+' : ''}${changePct}% ${changePct > 0 ? '↑' : '↓'}`;
        changeElement.style.color = changePct > 0 ? '#00ff00' : '#ff0000';

        document.getElementById('high').innerText = btc.high_24h.toFixed(2);
        document.getElementById('low').innerText = btc.low_24h.toFixed(2);

        const volBTC = (btc.total_volume / btc.current_price / 1000).toFixed(2) + 'K';
        const volUSD = (btc.total_volume / 1000000).toFixed(2) + 'M';
        document.getElementById('volume').innerText = volBTC;
        document.getElementById('amount').innerText = volUSD;

        const now = new Date();
        const utc3 = new Date(now.getTime() + 3 * 3600000);
        const dateStr = utc3.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = utc3.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
        const latency = Math.floor(Math.random() * 200 + 50);
        document.getElementById('time').innerText = `UTC+3 ${timeStr} ${dateStr} | ${latency}ms`;
    } catch (error) {
        console.error('Error fetching crypto data:', error);
    }
}