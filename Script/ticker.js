// Real-time cryptocurrency ticker data fetch and update
async function fetchCryptoData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,cardano,solana,polkadot,chainlink,avalanche-2,shiba-inu,matic-network&vs_currencies=usd&include_24hr_change=true');
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        const data = await response.json();

        // Map IDs to symbols and names
        const coinMap = {
            'bitcoin': { symbol: 'BTC', name: 'Bitcoin' },
            'ethereum': { symbol: 'ETH', name: 'Ethereum' },
            'ripple': { symbol: 'XRP', name: 'Ripple' },
            'cardano': { symbol: 'ADA', name: 'Cardano' },
            'solana': { symbol: 'SOL', name: 'Solana' },
            'polkadot': { symbol: 'DOT', name: 'Polkadot' },
            'chainlink': { symbol: 'LINK', name: 'Chainlink' },
            'avalanche-2': { symbol: 'AVAX', name: 'Avalanche' },
            'shiba-inu': { symbol: 'SHIB', name: 'Shiba Inu' },
            'matic-network': { symbol: 'MATIC', name: 'Polygon' }
        };

        const coins = [];
        for (const [id, info] of Object.entries(coinMap)) {
            if (data[id]) {
                const price = data[id].usd;
                const change = data[id].usd_24h_change;
                const formattedPrice = price < 1 ? `$${price.toFixed(6)}` : `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const formattedChange = (change >= 0 ? '+' : '') + change.toFixed(2) + '%';
                const changeClass = change >= 0 ? 'coin-change-positive' : 'coin-change-negative';

                coins.push({
                    symbol: info.symbol,
                    price: formattedPrice,
                    change: formattedChange,
                    changeClass: changeClass
                });
            }
        }

        return coins;
    } catch (error) {
        console.error('Error fetching crypto data:', error);
        // Fallback to sample data
        return [
            { symbol: 'BTC', price: '$122,489.00', change: '+1.57%', changeClass: 'coin-change-positive' },
            { symbol: 'ETH', price: '$4,505.70', change: '+0.32%', changeClass: 'coin-change-positive' },
            { symbol: 'XRP', price: '$3.05', change: '-0.55%', changeClass: 'coin-change-negative' },
            { symbol: 'ADA', price: '$0.87', change: '-0.07%', changeClass: 'coin-change-negative' },
            { symbol: 'SOL', price: '$233.25', change: '+0.20%', changeClass: 'coin-change-positive' },
            { symbol: 'DOT', price: '$4.32', change: '-0.44%', changeClass: 'coin-change-negative' },
            { symbol: 'LINK', price: '$22.54', change: '-1.92%', changeClass: 'coin-change-negative' },
            { symbol: 'AVAX', price: '$31.21', change: '+1.61%', changeClass: 'coin-change-positive' },
            { symbol: 'SHIB', price: '$0.000012', change: '+0.27%', changeClass: 'coin-change-positive' },
            { symbol: 'MATIC', price: '$0.24', change: '+0.41%', changeClass: 'coin-change-positive' }
        ];
    }
}

function updateTicker(coins) {
    const wrapper = document.getElementById('tickerWrapper');
    if (!wrapper) return;

    wrapper.innerHTML = coins.map(coin => `
                <div class="ticker-item">
                    <span class="coin-name">${coin.symbol}</span>
                    <span class="coin-price">${coin.price}</span>
                    <span class="${coin.changeClass}">${coin.change}</span>
                </div>
            `).join('');
}

// Initial load and periodic updates
async function loadTicker() {
    const coins = await fetchCryptoData();
    updateTicker(coins);
}

// Load on page load
document.addEventListener('DOMContentLoaded', loadTicker);

// Update every 30 seconds
setInterval(loadTicker, 30000);