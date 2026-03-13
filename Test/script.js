// Global variables
let chart;
let candlestickSeries;
let volumeSeries;
let orderBook = { bids: [], asks: [] };
let currentSymbol = 'BTCUSDT';
let historicalData = [];
let lastKlineTime = 0;

// DOM elements
const symbolSelector = document.getElementById('symbol-selector');
const currentPriceEl = document.getElementById('current-price');
const asksEl = document.getElementById('asks');
const bidsEl = document.getElementById('bids');
const chartContainer = document.getElementById('chart-container');
const orderForm = document.getElementById('order-form');
const orderHistory = document.getElementById('order-history');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeChart();
    symbolSelector.addEventListener('change', handleSymbolChange);
    orderForm.addEventListener('submit', handleOrderSubmit);
    loadHistoricalData();
    fetchOrderBook();
    updateCurrentPrice();
    setInterval(fetchOrderBook, 500); // Update order book every 500ms
    setInterval(updateChartWithNewData, 60000); // Check for new candles every minute
    setInterval(updateCurrentPrice, 5000); // Update price every 5s
});

// Initialize TradingView chart
function initializeChart() {
    chart = LightweightCharts.createChart(chartContainer, {
        layout: { background: { color: '#0d1117' }, textColor: '#f0f6fc' },
        grid: { vertLines: { color: '#30363d' }, horzLines: { color: '#30363d' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#30363d', scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: '#30363d', timeVisible: true, secondsVisible: false },
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        handleScroll: true,
        handleScale: true
    });

    candlestickSeries = chart.addCandlestickSeries({
        upColor: '#238636', downColor: '#da3633', borderVisible: false,
        wickUpColor: '#238636', wickDownColor: '#da3633'
    });

    volumeSeries = chart.addHistogramSeries({
        color: '#26a69a', priceFormat: { type: 'volume' },
        priceScaleId: '', scaleMargins: { top: 0.8, bottom: 0 }
    });

    window.addEventListener('resize', () => {
        chart.applyOptions({ width: chartContainer.clientWidth });
    });
}

// Handle symbol change
function handleSymbolChange(e) {
    currentSymbol = e.target.value;
    historicalData = [];
    lastKlineTime = 0;
    loadHistoricalData();
    fetchOrderBook();
    updateCurrentPrice();
}

// Load initial historical data
async function loadHistoricalData() {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${currentSymbol}&interval=1h&limit=500`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        historicalData = data.map(d => ({
            time: d[0] / 1000,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5])
        }));
        lastKlineTime = historicalData[historicalData.length - 1].time;
        updateChart();
        console.log('Historical data loaded successfully');
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

// Update chart with new data
async function updateChartWithNewData() {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${currentSymbol}&interval=1h&limit=1&endTime=${Date.now()}`);
        if (!response.ok) return;
        const data = await response.json();
        if (data.length === 0 || data[0][0] / 1000 <= lastKlineTime) return;
        const newCandle = {
            time: data[0][0] / 1000,
            open: parseFloat(data[0][1]),
            high: parseFloat(data[0][2]),
            low: parseFloat(data[0][3]),
            close: parseFloat(data[0][4]),
            volume: parseFloat(data[0][5])
        };
        historicalData.push(newCandle);
        lastKlineTime = newCandle.time;
        candlestickSeries.update(newCandle);
        volumeSeries.update({
            time: newCandle.time,
            value: newCandle.volume,
            color: newCandle.close >= newCandle.open ? 'rgba(35, 134, 54, 0.4)' : 'rgba(218, 54, 51, 0.4)'
        });
        console.log('New candle appended');
    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

// Update chart series
function updateChart() {
    const volumeData = historicalData.map(d => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(35, 134, 54, 0.4)' : 'rgba(218, 54, 51, 0.4)'
    }));
    candlestickSeries.setData(historicalData);
    volumeSeries.setData(volumeData);
    chart.timeScale().fitContent();
}

// Fetch order book data
async function fetchOrderBook() {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/depth?symbol=${currentSymbol}&limit=20`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        orderBook.asks = data.asks.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) }));
        orderBook.bids = data.bids.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) })).reverse();
        renderOrderBook();
        console.log('Order book updated');
    } catch (error) {
        console.error('Error fetching order book:', error);
    }
}

// Render order book
function renderOrderBook() {
    asksEl.innerHTML = orderBook.asks.map(row => 
        `<div class="row ask-row"><span>${row.price.toFixed(2)}</span><span>${row.quantity.toFixed(4)}</span></div>`
    ).join('');
    bidsEl.innerHTML = orderBook.bids.map(row => 
        `<div class="row bid-row"><span>${row.price.toFixed(2)}</span><span>${row.quantity.toFixed(4)}</span></div>`
    ).join('');
}

// Update current price
async function updateCurrentPrice() {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${currentSymbol}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        currentPriceEl.textContent = `$${parseFloat(data.price).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    } catch (error) {
        console.error('Error updating price:', error);
        currentPriceEl.textContent = 'Error loading price';
    }
}

// Handle order submission
function handleOrderSubmit(e) {
    e.preventDefault();
    const side = document.getElementById('side').value;
    const orderType = document.getElementById('order-type').value;
    const price = document.getElementById('price').value || 'Market';
    const quantity = document.getElementById('quantity').value;
    if (!quantity) return;
    const order = { side, type: orderType, price, quantity, timestamp: new Date().toLocaleTimeString() };
    console.log('Mock order placed:', order);
    const orderEl = document.createElement('div');
    orderEl.className = 'order-item';
    orderEl.innerHTML = `${order.timestamp} - ${order.side.toUpperCase()} ${order.quantity} ${currentSymbol} @ ${order.price}`;
    orderEl.style.color = side === 'buy' ? 'var(--accent-green)' : 'var(--accent-red)';
    orderHistory.appendChild(orderEl);
    orderForm.reset();
}