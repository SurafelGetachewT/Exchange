let chart;
let currentInterval = '1d';
let currentCoinId = 'bitcoin';
let currentSymbol = 'BTCUSDT';
let currentTab = 'Optional';
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];
let allCoins = [];
let lastKnownPrice = 0;
let balancesCache = { updatedAt: 0, map: new Map() };
const apiUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,cosmos-hub,cardano,bitcoin-cash,ripple,litecoin,usd-coin,dogecoin,filecoin,dai,tron,polkadot,chainlink,avalanche-2,near,aptos,optimism,arbitrum,stellar&order=market_cap_desc&per_page=250&page=1&sparkline=false&price_change_percentage=24h';
const rightColumn = document.getElementById('right-column');
const middleMessage = document.getElementById('middle-message');
const tabContainer = document.getElementById('tabContainer');
const timeIntervals = document.getElementById('timeIntervals');

const orderBookBody = document.getElementById('orderBookBody');
const searchBox = document.getElementById('searchBox');

// Elements in the trading section
const tradingSection = {
    pair: document.querySelector('#trading-section .pair'),
    favoriteStar: document.getElementById('favorite-star'),
    price: document.getElementById('price'),
    usdPrice: document.getElementById('usd-price'),
    change: document.getElementById('change'),
    high: document.getElementById('high'),
    low: document.getElementById('low'),
    volume: document.getElementById('volume'),
    amount: document.getElementById('amount'),
    time: document.getElementById('time'),
    logo: document.querySelector('#trading-section .logo')
};

// Cache for OHLC and order book data to reduce API calls
const ohlcCache = new Map();
const orderBookCache = new Map();

async function fetchCryptoData() {
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        allCoins = data;
        renderCryptoList(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        document.getElementById('cryptoList').innerHTML = '<li>Error loading data. Please try again later.</li>';
    }
}

async function fetchOHLCData(symbol = 'BTCUSDT', interval = '1d', limit = 1000) {
    const cacheKey = `${symbol}-${interval}`;
    if (ohlcCache.has(cacheKey)) {
        return ohlcCache.get(cacheKey);
    }

    try {
        const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
        if (!res.ok) {
            if (res.status === 429) console.warn('Rate limit exceeded, using cached data if available');
            throw new Error('Binance API request failed');
        }
        const data = await res.json();
        const candles = data.map(d => ({
            x: new Date(d[0]),
            y: [parseFloat(d[1]), parseFloat(d[2]), parseFloat(d[3]), parseFloat(d[4])]
        }));
        ohlcCache.set(cacheKey, candles);
        return candles;
    } catch (error) {
        console.error('Error fetching OHLC data:', error);
        return ohlcCache.get(cacheKey) || [];
    }
}

async function fetchOrderBook(symbol = 'BTCUSDT') {
    const cacheKey = `${symbol}-orderbook`;
    if (orderBookCache.has(cacheKey)) {
        return orderBookCache.get(cacheKey);
    }

    try {
        const res = await fetch(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=10`);
        if (!res.ok) {
            if (res.status === 429) console.warn('Rate limit exceeded for order book, using cached data if available');
            throw new Error('Binance order book API request failed');
        }
        const data = await res.json();
        orderBookCache.set(cacheKey, data);
        return data;
    } catch (error) {
        console.error('Error fetching order book data:', error);
        return orderBookCache.get(cacheKey) || { bids: [], asks: [] };
    }
}

async function fetchCurrentPrice(symbol = 'BTCUSDT') {
    try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
        if (!res.ok) throw new Error('Binance price API request failed');
        const data = await res.json();
        const p = parseFloat(data.price);
        if (!Number.isNaN(p)) lastKnownPrice = p;
        return p;
    } catch (error) {
        console.error('Error fetching current price:', error);
        return 0;
    }
}

async function fetch24hStats(symbol = 'BTCUSDT') {
    try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        if (!res.ok) throw new Error('Binance 24h stats API request failed');
        const data = await res.json();
        return {
            priceChangePercent: parseFloat(data.priceChangePercent),
            highPrice: parseFloat(data.highPrice),
            lowPrice: parseFloat(data.lowPrice),
            volume: parseFloat(data.volume),
            quoteVolume: parseFloat(data.quoteVolume)
        };
    } catch (error) {
        console.error('Error fetching 24h stats:', error);
        return null;
    }
}

async function updateTradingSection(coin, binanceSymbol) {
    const price = await fetchCurrentPrice(binanceSymbol);
    const stats = await fetch24hStats(binanceSymbol);
    const coinData = allCoins.find(c => c.id === coin.id);

    tradingSection.pair.textContent = `${coin.symbol.toUpperCase()}/USDT`;
    tradingSection.logo.src = coinData.image || 'Images/bitcoin.png';
    tradingSection.logo.alt = coinData.name;
    tradingSection.favoriteStar.classList.toggle('favorited', favorites.includes(coin.id));
    tradingSection.price.textContent = price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    tradingSection.usdPrice.textContent = `≈ $${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    if (stats) {
        tradingSection.change.textContent = `${stats.priceChangePercent.toFixed(4)}% ${stats.priceChangePercent >= 0 ? '↑' : '↓'}`;
        tradingSection.change.className = 'value';
        tradingSection.change.classList.add(stats.priceChangePercent >= 0 ? 'change-positive' : 'change-negative');
        tradingSection.high.textContent = stats.highPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        tradingSection.low.textContent = stats.lowPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        tradingSection.volume.textContent = (stats.volume / 1000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'K';
        tradingSection.amount.textContent = (stats.quoteVolume / 1000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M';
    } else {
        tradingSection.change.textContent = 'N/A';
        tradingSection.high.textContent = 'N/A';
        tradingSection.low.textContent = 'N/A';
        tradingSection.volume.textContent = 'N/A';
        tradingSection.amount.textContent = 'N/A';
    }

    const now = new Date();
    tradingSection.time.textContent = now.toLocaleString();
}

async function renderOrderBook(symbol, currentPrice) {
    const orderBook = await fetchOrderBook(symbol);
    const bids = orderBook.bids.slice(0, 10);
    const asks = orderBook.asks.slice(0, 10);
    orderBookBody.innerHTML = '';

    bids.forEach(([price, quantity]) => {
        const row = document.createElement('tr');
        row.classList.add('buy-row');
        row.innerHTML = `
            <td class="price">${parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="quantity">${parseFloat(quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        orderBookBody.appendChild(row);
    });

    const currentPriceRow = document.createElement('tr');
    currentPriceRow.classList.add('current-price-row');
    currentPriceRow.innerHTML = `
        <td colspan="2">Current Price: $${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    `;
    orderBookBody.appendChild(currentPriceRow);

    asks.forEach(([price, quantity]) => {
        const row = document.createElement('tr');
        row.classList.add('sell-row');
        row.innerHTML = `
            <td class="price">${parseFloat(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="quantity">${parseFloat(quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        `;
        orderBookBody.appendChild(row);
    });
}

async function renderChart(symbol, interval) {
    const candles = await fetchOHLCData(symbol, interval, 1000);
    const options = {
        chart: {
            type: 'candlestick',
            height: '100%',
            background: '#0d1117',
            foreColor: '#d1d4dc',
            toolbar: { show: true },
            zoom: { enabled: true },
            pan: { enabled: true, mode: 'x' },
            animations: { enabled: false }
        },
        series: [{ data: candles.slice(-200) }],
        xaxis: { type: 'datetime' },
        yaxis: { tooltip: { enabled: true } },
        grid: { show: true, borderColor: '#444c56', strokeDashArray: 0 },
        noData: { text: 'Loading...', align: 'center', verticalAlign: 'middle', style: { color: '#d1d4dc' } }
    };

    if (chart) {
        chart.updateOptions(options);
    } else {
        chart = new ApexCharts(document.querySelector("#chart"), options);
        chart.render();
    }
}

function renderCryptoList(coins) {
    const list = document.getElementById('cryptoList');
    list.innerHTML = '';
    let filteredCoins = coins;
    if (currentTab === 'Optional') {
        filteredCoins = coins.filter(coin => favorites.includes(coin.id));
    } else if (currentTab === 'Spot' || currentTab === 'Contract' || currentTab === 'Options') {
        filteredCoins = coins;
    } else {
        list.innerHTML = '<li>No data available for this tab.</li>';
        return;
    }
    const searchText = searchBox.value.toLowerCase();
    filteredCoins = filteredCoins.filter(coin => coin.symbol.toLowerCase().includes(searchText));
    filteredCoins.forEach(coin => {
        const item = document.createElement('li');
        item.classList.add('crypto-item');
        item.dataset.coinId = coin.id;

        const symbol = document.createElement('span');
        symbol.classList.add('symbol');

        const star = document.createElement('span');
        star.classList.add('star-icon');
        star.innerHTML = '★';
        if (favorites.includes(coin.id)) {
            star.classList.add('favorited');
        }
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(coin.id, star);
        });

        const symbolText = document.createElement('span');
        symbolText.textContent = `${coin.symbol.toUpperCase()}/USD`;

        symbol.appendChild(star);
        symbol.appendChild(symbolText);

        if (currentTab === 'Contract') {
            const subtext = document.createElement('span');
            subtext.classList.add('subtext');
            subtext.textContent = 'Perpetual';
            symbol.appendChild(subtext);
        } else if (currentTab === 'Options') {
            const subtext = document.createElement('span');
            subtext.classList.add('subtext');
            subtext.textContent = 'Options';
            symbol.appendChild(subtext);
        }

        const priceContainer = document.createElement('div');
        priceContainer.classList.add('price-container');

        const price = document.createElement('span');
        price.classList.add('price');
        price.textContent = `$${coin.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const change = document.createElement('span');
        const changeValue = coin.price_change_percentage_24h ? coin.price_change_percentage_24h.toFixed(2) : '0.00';
        change.textContent = `${changeValue}%`;
        if (parseFloat(changeValue) > 0) {
            change.classList.add('change-positive');
        } else if (parseFloat(changeValue) < 0) {
            change.classList.add('change-negative');
        }

        priceContainer.appendChild(price);
        priceContainer.appendChild(document.createElement('br'));
        priceContainer.appendChild(change);

        item.appendChild(symbol);
        item.appendChild(priceContainer);
        item.addEventListener('click', () => handleClick(`${coin.symbol.toUpperCase()}/USD`, coin.id));
        list.appendChild(item);
    });
}

function toggleFavorite(coinId, star) {
    const index = favorites.indexOf(coinId);
    if (index > -1) {
        favorites.splice(index, 1);
        star.classList.remove('favorited');
    } else {
        favorites.push(coinId);
        star.classList.add('favorited');
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderCryptoList(allCoins);
}

async function handleClick(selectedCoinSymbol, coinId) {
    const coin = allCoins.find(c => c.id === coinId);
    if (!coin) {
        console.error('Coin not found:', coinId);
        return;
    }

    const symbolParts = selectedCoinSymbol.split('/');
    const coinSymbol = symbolParts[0].toUpperCase();
    const mappedBinanceSymbol = coin.id === 'bitcoin' ? 'BTCUSDT' :
                         coin.id === 'ethereum' ? 'ETHUSDT' :
                         coin.id === 'cosmos-hub' ? 'ATOMUSDT' :
                         coin.id === 'cardano' ? 'ADAUSDT' :
                         coin.id === 'bitcoin-cash' ? 'BCHUSDT' :
                         coin.id === 'ripple' ? 'XRPUSDT' :
                         coin.id === 'litecoin' ? 'LTCUSDT' :
                         coin.id === 'usd-coin' ? 'USDCUSDT' :
                         coin.id === 'dogecoin' ? 'DOGEUSDT' :
                         coin.id === 'filecoin' ? 'FILUSDT' :
                         coin.id === 'dai' ? 'DAIUSDT' :
                         coin.id === 'tron' ? 'TRXUSDT' :
                         coin.id === 'polkadot' ? 'DOTUSDT' :
                         coin.id === 'chainlink' ? 'LINKUSDT' :
                         coin.id === 'avalanche-2' ? 'AVAXUSDT' :
                         coin.id === 'near' ? 'NEARUSDT' :
                         coin.id === 'aptos' ? 'APTUSDT' :
                         coin.id === 'optimism' ? 'OPUSDT' :
                         coin.id === 'arbitrum' ? 'ARBUSDT' :
                         coin.id === 'stellar' ? 'XLMUSDT' : null;

    const binanceSymbol = mappedBinanceSymbol || `${coinSymbol}USDT`;
    currentCoinId = coin.id;
    currentSymbol = binanceSymbol;

    try {
        await renderChart(binanceSymbol, currentInterval);
        const currentPrice = await fetchCurrentPrice(binanceSymbol);
        await renderOrderBook(binanceSymbol, currentPrice);
        await updateTradingSection(coin, binanceSymbol);
    } catch (error) {
        console.error('Error updating UI for symbol:', binanceSymbol, error);
        orderBookBody.innerHTML = '<tr><td colspan="2">Order book not available</td></tr>';
        tradingSection.pair.textContent = `${coinSymbol}/USDT`;
        tradingSection.logo.src = coin.image || 'Images/bitcoin.png';
        tradingSection.logo.alt = coin.name;
        tradingSection.favoriteStar.classList.toggle('favorited', favorites.includes(coin.id));
        tradingSection.price.textContent = 'N/A';
        tradingSection.usdPrice.textContent = 'N/A';
        tradingSection.change.textContent = 'N/A';
        tradingSection.high.textContent = 'N/A';
        tradingSection.low.textContent = 'N/A';
        tradingSection.volume.textContent = 'N/A';
        tradingSection.amount.textContent = 'N/A';
        const now = new Date();
        tradingSection.time.textContent = now.toLocaleString();
    }

    renderTradePanel();
}

async function loadBalances() {
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true' && !!localStorage.getItem('accessToken');
    if (!isLoggedIn) {
        balancesCache = { updatedAt: 0, map: new Map() };
        return balancesCache.map;
    }

    const now = Date.now();
    if (balancesCache.updatedAt && (now - balancesCache.updatedAt) < 5000) {
        return balancesCache.map;
    }

    try {
        const data = await apiRequestWithRefresh('/wallets');
        const map = new Map();
        (data?.wallets || []).forEach((w) => {
            map.set(String(w.currency || '').toUpperCase(), {
                balance: Number(w.balance || 0),
                locked: Number(w.locked_balance || 0)
            });
        });
        balancesCache = { updatedAt: now, map };
        return map;
    } catch (_) {
        balancesCache = { updatedAt: now, map: new Map() };
        return balancesCache.map;
    }
}

function renderTradePanel() {
    const tradeMount = document.getElementById('trade-panel') || middleMessage;
    if (!tradeMount) return;

    const isLoggedIn = localStorage.getItem('loggedIn') === 'true' && !!localStorage.getItem('accessToken');
    const base = currentSymbol.replace('USDT', '');

    const state = {
        side: 'BUY',
        type: 'LIMIT'
    };

    const mount = async () => {
        const balances = await loadBalances();
        const usdt = balances.get('USDT')?.balance ?? 0;
        const baseBal = balances.get(base)?.balance ?? 0;
        let availableBuy = usdt;
        let availableSell = baseBal;

        const panelBg = '#0d1117';
        const panelBorder = '#1f2630';
        const pillBg = '#151b23';
        const green = '#16c784';
        const red = '#ea3943';
        const text = '#d1d4dc';
        const muted = '#8b949e';

        tradeMount.innerHTML = `
            <div style="padding:12px;border:1px solid ${panelBorder};border-radius:12px;background:${panelBg};max-width:340px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <div style="font-weight:600;color:${text};">Spot</div>
                    <div style="color:${muted};font-size:12px;">Futures</div>
                </div>

                <div id="bsToggle" style="display:flex;background:${pillBg};border-radius:999px;padding:4px;gap:4px;">
                    <button type="button" data-side="BUY" style="flex:1;border:none;border-radius:999px;padding:8px 10px;font-weight:700;cursor:pointer;background:${green};color:#071018;">Buy</button>
                    <button type="button" data-side="SELL" style="flex:1;border:none;border-radius:999px;padding:8px 10px;font-weight:700;cursor:pointer;background:transparent;color:${muted};">Sell</button>
                </div>

                <div style="display:flex;gap:16px;margin-top:10px;margin-bottom:8px;align-items:center;">
                    <button id="ttLimit" type="button" data-type="LIMIT" style="border:none;background:transparent;color:${text};font-weight:700;cursor:pointer;">Limit</button>
                    <button id="ttMarket" type="button" data-type="MARKET" style="border:none;background:transparent;color:${muted};font-weight:700;cursor:pointer;">Market</button>
                    <div style="margin-left:auto;color:${muted};font-weight:700;">TP/SL</div>
                </div>

                <div style="display:flex;justify-content:space-between;align-items:center;color:${muted};font-size:12px;margin-bottom:10px;">
                    <div>Available</div>
                    <div id="availText">--</div>
                </div>

                <div style="color:${muted};font-size:12px;margin-bottom:6px;">Price (USDT)</div>
                <input id="inPrice" type="number" step="any" min="0" value="${lastKnownPrice || ''}" style="width:100%;box-sizing:border-box;padding:12px 12px;border-radius:10px;border:1px solid ${panelBorder};background:#0b0f14;color:${text};outline:none;" />

                <div style="color:${muted};font-size:12px;margin-top:10px;margin-bottom:6px;">Amount (${base})</div>
                <input id="inAmount" type="number" step="any" min="0" placeholder="" style="width:100%;box-sizing:border-box;padding:12px 12px;border-radius:10px;border:1px solid ${panelBorder};background:#0b0f14;color:${text};outline:none;" />

                <input id="pct" type="range" min="0" max="100" value="0" style="width:100%;margin-top:10px;" ${isLoggedIn ? '' : 'disabled'} />
                <div style="display:flex;justify-content:space-between;color:${muted};font-size:11px;margin-top:4px;">
                    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
                </div>

                <div style="color:${muted};font-size:12px;margin-top:10px;margin-bottom:6px;">Total (USDT)</div>
                <input id="inTotal" type="number" step="any" min="0" placeholder="" style="width:100%;box-sizing:border-box;padding:12px 12px;border-radius:10px;border:1px solid ${panelBorder};background:#0b0f14;color:${text};outline:none;" />

                <button id="placeOrderBtn" type="button" style="width:100%;margin-top:12px;padding:12px;border:none;border-radius:10px;font-weight:800;cursor:pointer;background:${green};color:#071018;" ${isLoggedIn ? '' : 'disabled'}>
                    Buy
                </button>

                <button id="demoDepositBtn" type="button" style="width:100%;margin-top:10px;padding:12px;border-radius:10px;border:1px solid ${panelBorder};background:${pillBg};color:${text};font-weight:700;cursor:pointer;" ${isLoggedIn ? '' : 'disabled'}>
                    Demo Deposit +1000 USDT
                </button>

                ${isLoggedIn ? '' : `<div style="margin-top:10px;color:${red};font-size:12px;">Please login to place orders.</div>`}

                <div id="tradeOrderMsg" style="margin-top:10px;font-size:12px;color:${muted};"></div>
            </div>
        `;

        const setSide = (side) => {
            state.side = side;
            const buttons = tradeMount.querySelectorAll('#bsToggle button');
            buttons.forEach((b) => {
                const s = b.getAttribute('data-side');
                const active = s === side;
                b.style.background = active ? (side === 'BUY' ? green : red) : 'transparent';
                b.style.color = active ? '#071018' : muted;
            });
            const placeBtn = document.getElementById('placeOrderBtn');
            if (placeBtn) {
                placeBtn.textContent = side === 'BUY' ? 'Buy' : 'Sell';
                placeBtn.style.background = side === 'BUY' ? green : red;
            }
            updateAvailable();
            syncFromPct();
        };

        const setType = (type) => {
            state.type = type;
            const limitBtn = document.getElementById('ttLimit');
            const marketBtn = document.getElementById('ttMarket');
            if (limitBtn && marketBtn) {
                limitBtn.style.color = type === 'LIMIT' ? text : muted;
                marketBtn.style.color = type === 'MARKET' ? text : muted;
            }
            const priceInput = document.getElementById('inPrice');
            if (priceInput) {
                priceInput.disabled = type === 'MARKET';
                if (type === 'MARKET') {
                    priceInput.value = String(lastKnownPrice || '');
                }
            }
            syncTotals();
        };

        const updateAvailable = () => {
            const avail = state.side === 'BUY' ? availableBuy : availableSell;
            const cur = state.side === 'BUY' ? 'USDT' : base;
            const el = document.getElementById('availText');
            if (el) el.textContent = `${avail.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${cur}`;
        };

        const getPrice = () => {
            const priceInput = document.getElementById('inPrice');
            const p = Number(priceInput?.value);
            return Number.isFinite(p) && p > 0 ? p : (lastKnownPrice || 0);
        };

        const syncTotals = () => {
            const price = getPrice();
            const amountInput = document.getElementById('inAmount');
            const totalInput = document.getElementById('inTotal');
            const amount = Number(amountInput?.value);

            if (!totalInput) return;
            if (!Number.isFinite(amount) || amount <= 0 || !price) {
                totalInput.value = '';
                return;
            }
            const total = amount * price;
            totalInput.value = String(total);
        };

        const syncAmountFromTotal = () => {
            const price = getPrice();
            const amountInput = document.getElementById('inAmount');
            const totalInput = document.getElementById('inTotal');
            const total = Number(totalInput?.value);
            if (!amountInput) return;
            if (!Number.isFinite(total) || total <= 0 || !price) {
                amountInput.value = '';
                return;
            }
            amountInput.value = String(total / price);
        };

        const syncFromPct = () => {
            const pctEl = document.getElementById('pct');
            const amountInput = document.getElementById('inAmount');
            const totalInput = document.getElementById('inTotal');
            if (!pctEl || !amountInput || !totalInput) return;

            const pct = Number(pctEl.value) / 100;
            const price = getPrice();
            if (!price) return;

            if (state.side === 'BUY') {
                const spend = availableBuy * pct;
                totalInput.value = String(spend);
                amountInput.value = String(spend / price);
            } else {
                const sellAmt = availableSell * pct;
                amountInput.value = String(sellAmt);
                totalInput.value = String(sellAmt * price);
            }
        };

        updateAvailable();
        setSide('BUY');
        setType('LIMIT');

        tradeMount.querySelectorAll('#bsToggle button').forEach((b) => {
            b.addEventListener('click', () => setSide(b.getAttribute('data-side')));
        });

        const limitBtn = document.getElementById('ttLimit');
        const marketBtn = document.getElementById('ttMarket');
        if (limitBtn) limitBtn.addEventListener('click', () => setType('LIMIT'));
        if (marketBtn) marketBtn.addEventListener('click', () => setType('MARKET'));

        const priceInput = document.getElementById('inPrice');
        const amountInput = document.getElementById('inAmount');
        const totalInput = document.getElementById('inTotal');
        const pctEl = document.getElementById('pct');

        if (priceInput) priceInput.addEventListener('input', () => {
            lastKnownPrice = Number(priceInput.value) || lastKnownPrice;
            syncTotals();
        });
        if (amountInput) amountInput.addEventListener('input', () => syncTotals());
        if (totalInput) totalInput.addEventListener('input', () => syncAmountFromTotal());
        if (pctEl) pctEl.addEventListener('input', () => syncFromPct());

        const msgEl = document.getElementById('tradeOrderMsg');
        const placeBtn = document.getElementById('placeOrderBtn');
        if (placeBtn) {
            placeBtn.addEventListener('click', async () => {
                if (!msgEl) return;
                msgEl.style.color = muted;
                msgEl.textContent = 'Submitting order...';

                const price = state.type === 'MARKET' ? null : getPrice();
                const amount = Number(document.getElementById('inAmount')?.value);

                try {
                    const payload = {
                        type: state.type,
                        side: state.side,
                        symbol: currentSymbol,
                        amount,
                        price
                    };

                    const data = await apiRequestWithRefresh('/orders', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });

                    msgEl.style.color = green;
                    msgEl.textContent = `Order created: ${data?.order?.side || ''} ${data?.order?.amount || ''} ${data?.order?.symbol || ''}`;
                    balancesCache.updatedAt = 0;
                    renderOrdersPanel();
                } catch (err) {
                    msgEl.style.color = red;
                    const details = err?.data?.details;
                    if (Array.isArray(details) && details.length > 0) {
                        msgEl.textContent = details.map((d) => `${d.path || d.param}: ${d.msg}`).join(' | ');
                    } else if (typeof details === 'string' && details.trim()) {
                        msgEl.textContent = `${err?.data?.error || 'Failed to place order'}: ${details}`;
                    } else {
                        msgEl.textContent = err?.message || 'Failed to place order';
                    }
                }
            });
        }

        const depositBtn = document.getElementById('demoDepositBtn');
        if (depositBtn) {
            depositBtn.addEventListener('click', async () => {
                if (!msgEl) return;

                msgEl.style.color = muted;
                msgEl.textContent = 'Depositing...';

                try {
                    const data = await apiRequestWithRefresh('/wallets/deposit', {
                        method: 'POST',
                        body: JSON.stringify({ currency: 'USDT', amount: 1000 })
                    });

                    balancesCache.updatedAt = 0;
                    msgEl.style.color = green;
                    msgEl.textContent = `Deposit successful. USDT balance: ${data?.wallet?.balanceAfter}`;

                    const b = await loadBalances();
                    const u = b.get('USDT')?.balance ?? 0;
                    const bb = b.get(base)?.balance ?? 0;
                    availableBuy = u;
                    availableSell = bb;
                    balancesCache.updatedAt = Date.now();
                    updateAvailable();
                    syncFromPct();
                    renderOrdersPanel();
                } catch (err) {
                    msgEl.style.color = red;
                    msgEl.textContent = err?.message || 'Deposit failed';
                }
            });
        }
    };

    mount();
}

async function renderOrdersPanel() {
    const ordersMount = document.getElementById('orders-panel');
    if (!ordersMount) return;

    const isLoggedIn = localStorage.getItem('loggedIn') === 'true' && !!localStorage.getItem('accessToken');
    if (!isLoggedIn) {
        ordersMount.innerHTML = '';
        return;
    }

    const panelBg = '#0d1117';
    const panelBorder = '#1f2630';
    const text = '#d1d4dc';
    const muted = '#8b949e';
    const red = '#ea3943';
    const green = '#16c784';

    ordersMount.innerHTML = `
        <div style="padding:12px;border:1px solid ${panelBorder};border-radius:12px;background:${panelBg};">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
                <div style="font-weight:700;color:${text};">My Orders</div>
                <button id="refreshOrdersBtn" type="button" style="border:1px solid ${panelBorder};background:transparent;color:${muted};padding:6px 10px;border-radius:8px;cursor:pointer;">Refresh</button>
            </div>
            <div id="ordersList" style="margin-top:10px;color:${muted};font-size:12px;">Loading...</div>
        </div>
    `;

    const refreshBtn = document.getElementById('refreshOrdersBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', () => renderOrdersPanel());

    const listEl = document.getElementById('ordersList');
    try {
        const data = await apiRequestWithRefresh('/orders?limit=20&offset=0');
        const orders = data?.orders || [];
        if (!listEl) return;

        if (orders.length === 0) {
            listEl.textContent = 'No orders yet.';
            return;
        }

        const rows = orders.map((o) => {
            const side = String(o.side || '').toUpperCase();
            const sideColor = side === 'BUY' ? green : red;
            const type = String(o.type || '');
            const symbol = String(o.symbol || '');
            const status = String(o.status || '');
            const amount = Number(o.amount || 0);
            const price = o.price === null || o.price === undefined ? null : Number(o.price);
            const created = o.created_at ? new Date(o.created_at).toLocaleString() : '';

            return `
                <div style="display:grid;grid-template-columns:1fr auto;gap:6px;padding:10px 0;border-bottom:1px solid ${panelBorder};">
                    <div>
                        <div style="color:${text};font-weight:700;">
                            <span style="color:${sideColor};">${side}</span>
                            <span style="opacity:0.9;"> ${symbol}</span>
                        </div>
                        <div style="margin-top:4px;">${type} • Amount: ${amount}</div>
                        <div>Price: ${price ? price : 'MKT'} • Status: ${status}</div>
                        <div style="margin-top:4px;font-size:11px;opacity:0.9;">${created}</div>
                    </div>
                </div>
            `;
        });

        listEl.innerHTML = rows.join('');
    } catch (err) {
        if (listEl) listEl.textContent = err?.message || 'Failed to load orders';
    }
}

timeIntervals.addEventListener('click', (event) => {
    if (event.target.classList.contains('time-btn')) {
        timeIntervals.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
        currentInterval = event.target.dataset.interval;
        const coin = allCoins.find(c => c.id === currentCoinId);
        if (coin) handleClick(`${coin.symbol.toUpperCase()}/USD`, coin.id);
    }
});

tabContainer.addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (tab && tab.parentElement === tabContainer) {
        tabContainer.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        renderCryptoList(allCoins);
    }
});

searchBox.addEventListener('input', () => {
    renderCryptoList(allCoins);
});

fetchCryptoData();
renderChart('BTCUSDT', '1d');
fetchCurrentPrice('BTCUSDT').then(price => renderOrderBook('BTCUSDT', price));
const initialCoin = allCoins.find(c => c.id === 'bitcoin') || { symbol: 'BTC', id: 'bitcoin', image: 'Images/bitcoin.png', name: 'Bitcoin' };
updateTradingSection(initialCoin, 'BTCUSDT');
renderTradePanel();
renderOrdersPanel();

setInterval(fetchCryptoData, 60000);
setInterval(() => {
    const coin = allCoins.find(c => c.id === currentCoinId) || { symbol: currentSymbol.replace('USDT', ''), id: currentCoinId, image: 'Images/bitcoin.png', name: currentCoinId };
    fetchCurrentPrice(currentSymbol).then(price => {
        renderOrderBook(currentSymbol, price);
        updateTradingSection(coin, currentSymbol);
    });
}, 10000);