// Global variables
let apiBaseUrl = 'https://768451.xyz';
let statsChart = null;
let isDarkMode = false;
let currentPage = 1;
const logsPerPage = 10;
let filteredLogs = [];

// IP location cache
const ipLocationCache = new Map();

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load saved settings
    loadSettings();
    
    // Set up theme toggle
    setupThemeToggle();
    
    // Set up tabs
    setupTabs();
    
    // Initial data load
    fetchQuote();
    fetchRiddle();
    fetchStats();
    fetchAccessStats();
    
    // Set up clear data button
    document.getElementById('clearData').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.clear();
        clearIpLocationCache();
        showToast('Local data and cache cleared successfully!', 'success');
    });
});

// Load saved settings
function loadSettings() {
    // Load API base URL
    const savedUrl = localStorage.getItem('apiBaseUrl');
    if (savedUrl) {
        apiBaseUrl = savedUrl;
        document.getElementById('apiBaseUrl').value = apiBaseUrl;
    }
    
    // Load theme preference
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme === 'true') {
        isDarkMode = true;
        document.body.classList.add('dark');
        document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
    }
}

// Set up theme toggle
function setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', function() {
        isDarkMode = !isDarkMode;
        document.body.classList.toggle('dark');
        
        if (isDarkMode) {
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
        
        localStorage.setItem('darkMode', isDarkMode);
        
        // Update chart theme if it exists
        if (statsChart) {
            updateChartTheme();
        }
    });
}

// Set up tabs
function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            const tabContainer = this.parentElement;
            const contentContainer = tabContainer.parentElement;
            
            // Remove active class from all tabs in this container
            tabContainer.querySelectorAll('.tab').forEach(t => {
                t.classList.remove('active');
            });
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content in this container
            contentContainer.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // Show the selected tab content
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Update the base URL
function updateBaseUrl() {
    const newUrl = document.getElementById('apiBaseUrl').value.trim();
    if (newUrl) {
        apiBaseUrl = newUrl;
        localStorage.setItem('apiBaseUrl', apiBaseUrl);
        showToast('API Base URL updated successfully!', 'success');
        
        // Refresh all data with new URL
        fetchQuote();
        fetchRiddle();
        fetchStats();
        fetchAccessStats();
    } else {
        showToast('Please enter a valid URL!', 'error');
    }
}

// Fetch daily quote
async function fetchQuote() {
    try {
        const quoteText = document.getElementById('quote-text');
        quoteText.innerHTML = '<div class="center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        const response = await fetch(`${apiBaseUrl}/quote`);
        const data = await response.json();
        
        if (data.code === 200) {
            const quoteAuthor = document.getElementById('quote-author');
            
            // Extract quote and author if possible
            const quoteMatch = data.data.match(/(.*?)——(.*)/);
            
            if (quoteMatch) {
                quoteText.textContent = quoteMatch[1].trim();
                quoteAuthor.textContent = `— ${quoteMatch[2].trim()}`;
            } else {
                quoteText.textContent = data.data;
                quoteAuthor.textContent = '';
            }
        } else {
            showToast('Failed to fetch quote: ' + data.message, 'error');
            quoteText.textContent = 'Failed to load quote.';
        }
    } catch (error) {
        console.error('Error fetching quote:', error);
        showToast('Error fetching quote. Check console for details.', 'error');
        document.getElementById('quote-text').textContent = 'Error loading quote.';
    }
}

// Fetch riddle
async function fetchRiddle() {
    try {
        const riddleQuestion = document.getElementById('riddle-question');
        riddleQuestion.innerHTML = '<div class="center"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
        
        const response = await fetch(`${apiBaseUrl}/riddle`);
        const data = await response.json();
        
        if (data.code === 200) {
            const riddleAnswer = document.getElementById('riddle-answer');
            const showAnswerBtn = document.getElementById('show-answer');
            
            riddleQuestion.textContent = data.data.question;
            riddleAnswer.textContent = data.data.answer;
            riddleAnswer.classList.add('hidden');
            showAnswerBtn.innerHTML = '<i class="fas fa-eye"></i> Show Answer';
        } else {
            showToast('Failed to fetch riddle: ' + data.message, 'error');
            riddleQuestion.textContent = 'Failed to load riddle.';
        }
    } catch (error) {
        console.error('Error fetching riddle:', error);
        showToast('Error fetching riddle. Check console for details.', 'error');
        document.getElementById('riddle-question').textContent = 'Error loading riddle.';
    }
}

// Toggle riddle answer visibility
function toggleAnswer() {
    const riddleAnswer = document.getElementById('riddle-answer');
    const showAnswerBtn = document.getElementById('show-answer');
    
    if (riddleAnswer.classList.contains('hidden')) {
        riddleAnswer.classList.remove('hidden');
        showAnswerBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Answer';
    } else {
        riddleAnswer.classList.add('hidden');
        showAnswerBtn.innerHTML = '<i class="fas fa-eye"></i> Show Answer';
    }
}

// Fetch API statistics
async function fetchStats() {
    try {
        const statsData = document.getElementById('stats-data');
        statsData.innerHTML = '<div class="center"><i class="fas fa-spinner fa-spin"></i> Loading statistics...</div>';
        
        const response = await fetch(`${apiBaseUrl}/stats`);
        const data = await response.json();
        
        if (data.code === 200) {
            displayStats(data.data);
            createStatsChart(data.data);
        } else {
            showToast('Failed to fetch statistics: ' + data.message, 'error');
            statsData.innerHTML = 'Failed to load statistics.';
        }
    } catch (error) {
        console.error('Error fetching statistics:', error);
        showToast('Error fetching statistics. Check console for details.', 'error');
        document.getElementById('stats-data').innerHTML = 'Error loading statistics.';
    }
}

// Display statistics data
function displayStats(stats) {
    const statsData = document.getElementById('stats-data');
    
    if (stats.length === 0) {
        statsData.innerHTML = '<p>No statistics available.</p>';
        return;
    }
    
    let html = '<table>';
    html += '<thead><tr><th>Endpoint</th><th>Count</th><th>Last Accessed</th></tr></thead><tbody>';
    
    stats.forEach(stat => {
        const lastAccessed = new Date(stat.last_accessed).toLocaleString();
        html += `<tr>
            <td>${stat.endpoint}</td>
            <td><span class="badge badge-primary">${stat.count}</span></td>
            <td>${lastAccessed}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    statsData.innerHTML = html;
}

// Create statistics chart
function createStatsChart(stats) {
    const ctx = document.getElementById('stats-chart');
    
    // Destroy previous chart if it exists
    if (statsChart) {
        statsChart.destroy();
    }
    
    // Clear the canvas
    ctx.getContext('2d').clearRect(0, 0, ctx.width, ctx.height);
    
    const labels = stats.map(stat => stat.endpoint);
    const counts = stats.map(stat => stat.count);
    
    // Create new chart
    statsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'API Calls',
                data: counts,
                backgroundColor: [
                    '#6366f1',
                    '#f97316',
                    '#10b981',
                    '#ef4444'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                        color: isDarkMode ? '#cbd5e1' : '#1e293b'
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: isDarkMode ? '#cbd5e1' : '#1e293b'
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: isDarkMode ? '#cbd5e1' : '#1e293b'
                    }
                }
            }
        }
    });
}

// Update chart theme
function updateChartTheme() {
    if (statsChart) {
        statsChart.options.scales.y.ticks.color = isDarkMode ? '#cbd5e1' : '#1e293b';
        statsChart.options.scales.x.ticks.color = isDarkMode ? '#cbd5e1' : '#1e293b';
        statsChart.options.scales.y.grid.color = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        statsChart.options.scales.x.grid.color = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        statsChart.options.plugins.legend.labels.color = isDarkMode ? '#cbd5e1' : '#1e293b';
        statsChart.update();
    }
}

// Fetch access statistics
async function fetchAccessStats() {
    try {
        const accessLogs = document.getElementById('access-logs');
        accessLogs.innerHTML = '<tr><td colspan="4" class="center"><i class="fas fa-spinner fa-spin"></i> Loading logs...</td></tr>';
        
        const response = await fetch(`${apiBaseUrl}/access-stats`);
        const data = await response.json();
        
        if (data.code === 200) {
            // Store the data globally for filtering
            window.accessLogsData = data.data;
            filteredLogs = data.data;
            currentPage = 1;
            displayAccessLogs(filteredLogs);
        } else {
            showToast('Failed to fetch access logs: ' + data.message, 'error');
            accessLogs.innerHTML = '<tr><td colspan="4" class="center">Failed to load access logs.</td></tr>';
        }
    } catch (error) {
        console.error('Error fetching access logs:', error);
        showToast('Error fetching access logs. Check console for details.', 'error');
        document.getElementById('access-logs').innerHTML = '<tr><td colspan="4" class="center">Error loading access logs.</td></tr>';
    }
}

// Get location info for multiple IPs
async function getIpLocations(ips) {
    const uniqueIps = [...new Set(ips)];
    const uncachedIps = uniqueIps.filter(ip => !ipLocationCache.has(ip));
    
    if (uncachedIps.length > 0) {
        const batchSize = 5; // Process 5 IPs at a time
        for (let i = 0; i < uncachedIps.length; i += batchSize) {
            const batch = uncachedIps.slice(i, i + batchSize);
            await Promise.all(batch.map(async (ip) => {
                const location = await getIpLocation(ip);
                ipLocationCache.set(ip, location);
            }));
        }
    }
    
    return ips.map(ip => ipLocationCache.get(ip) || 'Unknown');
}

// Get location info for a single IP
async function getIpLocation(ip) {
    try {
        const response = await fetch(`${apiBaseUrl}/ip-location?ip=${encodeURIComponent(ip)}`);
        const data = await response.json();
        
        if (data.code === 200) {
            const { province, city } = data.data;
            return province && city ? `${province}, ${city}` : (province || city || 'Unknown');
        }
        return 'Unknown';
    } catch (error) {
        console.error('Error fetching IP location:', error);
        return 'Unknown';
    }
}

// Display access logs with pagination
async function displayAccessLogs(logs) {
    const accessLogs = document.getElementById('access-logs');
    
    if (logs.length === 0) {
        accessLogs.innerHTML = '<tr><td colspan="4" class="center">No access logs available.</td></tr>';
        document.getElementById('access-pagination').innerHTML = '';
        return;
    }
    
    // Calculate pagination
    const totalPages = Math.ceil(logs.length / logsPerPage);
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = Math.min(startIndex + logsPerPage, logs.length);
    const currentLogs = logs.slice(startIndex, endIndex);
    
    // Show loading state with progress
    accessLogs.innerHTML = '<tr><td colspan="4" class="center"><i class="fas fa-spinner fa-spin"></i> Loading location data...<br><small class="text-muted">This might take a few seconds</small></td></tr>';
    
    // Get all IPs for current page
    const ips = currentLogs.map(log => log.ip);
    
    try {
        // Get locations for all IPs in current page
        const locations = await getIpLocations(ips);
        
        // Generate table rows
        let html = '';
        currentLogs.forEach((log, index) => {
            const accessTime = new Date(log.access_time).toLocaleString();
            html += `<tr>
                <td>${log.ip}</td>
                <td>${locations[index]}</td>
                <td>${log.endpoint}</td>
                <td>${accessTime}</td>
            </tr>`;
        });
        
        accessLogs.innerHTML = html;
    } catch (error) {
        console.error('Error loading locations:', error);
        accessLogs.innerHTML = currentLogs.map(log => `
            <tr>
                <td>${log.ip}</td>
                <td>Error loading location</td>
                <td>${log.endpoint}</td>
                <td>${new Date(log.access_time).toLocaleString()}</td>
            </tr>
        `).join('');
    }
    
    // Generate pagination controls
    generatePagination(totalPages);
}

// Generate pagination controls
function generatePagination(totalPages) {
    const pagination = document.getElementById('access-pagination');
    
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `<button ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
        <i class="fas fa-chevron-left"></i>
    </button>`;
    
    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        html += `<button onclick="changePage(1)">1</button>`;
        if (startPage > 2) {
            html += `<button disabled>...</button>`;
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `<button disabled>...</button>`;
        }
        html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
    }
    
    // Next button
    html += `<button ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
        <i class="fas fa-chevron-right"></i>
    </button>`;
    
    pagination.innerHTML = html;
}

// Change page
function changePage(page) {
    currentPage = page;
    displayAccessLogs(filteredLogs);
}

// Filter access logs
function filterAccessLogs() {
    if (!window.accessLogsData) return;
    
    const endpointFilter = document.getElementById('endpoint-filter').value;
    const ipFilter = document.getElementById('ip-filter').value.toLowerCase();
    
    filteredLogs = window.accessLogsData;
    
    // Filter by endpoint
    if (endpointFilter !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.endpoint === endpointFilter);
    }
    
    // Filter by IP
    if (ipFilter) {
        filteredLogs = filteredLogs.filter(log => log.ip.toLowerCase().includes(ipFilter));
    }
    
    // Reset to first page when filtering
    currentPage = 1;
    displayAccessLogs(filteredLogs);
    
    // Show feedback to user
    showToast(`Showing ${filteredLogs.length} filtered results`, 'info');
}

// Run quote test cases
async function runQuoteTest(testType) {
    const resultElement = document.getElementById(`quote-test-${testType}-result`);
    resultElement.classList.remove('hidden', 'success', 'error');
    resultElement.innerHTML = '<div class="center"><i class="fas fa-spinner fa-spin"></i> Running test...</div>';
    
    try {
        const response = await fetch(`${apiBaseUrl}/quote`);
        const data = await response.json();
        
        if (testType === 'basic') {
            // Basic test just checks if we get a successful response
            if (data.code === 200 && data.data) {
                resultElement.classList.add('success');
                resultElement.innerHTML = `✅ Test passed!\n\nResponse:\n${JSON.stringify(data, null, 2)}`;
            } else {
                resultElement.classList.add('error');
                resultElement.innerHTML = `❌ Test failed!\n\nExpected code 200 with data, got:\n${JSON.stringify(data, null, 2)}`;
            }
        } else if (testType === 'validation') {
            // Validation test checks if the response has the expected format
            if (data.code === 200 && data.data) {
                const quoteMatch = data.data.match(/(.*?)——(.*)/);
                
                if (quoteMatch) {
                    resultElement.classList.add('success');
                    resultElement.innerHTML = `✅ Test passed!\n\nQuote: "${quoteMatch[1].trim()}"\nAuthor: ${quoteMatch[2].trim()}\n\nFull response:\n${JSON.stringify(data, null, 2)}`;
                } else {
                    resultElement.classList.add('error');
                    resultElement.innerHTML = `⚠️ Test partially passed!\n\nResponse contains data but couldn't extract quote and author.\n\nData: ${data.data}\n\nFull response:\n${JSON.stringify(data, null, 2)}`;
                }
            } else {
                resultElement.classList.add('error');
                resultElement.innerHTML = `❌ Test failed!\n\nExpected code 200 with data, got:\n${JSON.stringify(data, null, 2)}`;
            }
        }
    } catch (error) {
        console.error(`Error running ${testType} quote test:`, error);
        resultElement.classList.add('error');
        resultElement.innerHTML = `❌ Test failed!\n\nError: ${error.message}`;
    }
}

// Run riddle test cases
async function runRiddleTest(testType) {
    const resultElement = document.getElementById(`riddle-test-${testType}-result`);
    resultElement.classList.remove('hidden', 'success', 'error');
    resultElement.innerHTML = '<div class="center"><i class="fas fa-spinner fa-spin"></i> Running test...</div>';
    
    try {
        const response = await fetch(`${apiBaseUrl}/riddle`);
        const data = await response.json();
        
        if (testType === 'basic') {
            // Basic test just checks if we get a successful response
            if (data.code === 200 && data.data) {
                resultElement.classList.add('success');
                resultElement.innerHTML = `✅ Test passed!\n\nResponse:\n${JSON.stringify(data, null, 2)}`;
            } else {
                resultElement.classList.add('error');
                resultElement.innerHTML = `❌ Test failed!\n\nExpected code 200 with data, got:\n${JSON.stringify(data, null, 2)}`;
            }
        } else if (testType === 'validation') {
            // Validation test checks if the response has the expected structure
            if (data.code === 200 && data.data && data.data.question && data.data.answer) {
                resultElement.classList.add('success');
                resultElement.innerHTML = `✅ Test passed!\n\nQuestion: "${data.data.question}"\nAnswer: "${data.data.answer}"\n\nFull response:\n${JSON.stringify(data, null, 2)}`;
            } else if (data.code === 200 && data.data) {
                resultElement.classList.add('error');
                resultElement.innerHTML = `⚠️ Test partially passed!\n\nResponse contains data but missing question or answer.\n\nData: ${JSON.stringify(data.data, null, 2)}\n\nFull response:\n${JSON.stringify(data, null, 2)}`;
            } else {
                resultElement.classList.add('error');
                resultElement.innerHTML = `❌ Test failed!\n\nExpected code 200 with data, got:\n${JSON.stringify(data, null, 2)}`;
            }
        }
    } catch (error) {
        console.error(`Error running ${testType} riddle test:`, error);
        resultElement.classList.add('error');
        resultElement.innerHTML = `❌ Test failed!\n\nError: ${error.message}`;
    }
}

// Show toast notification
function showToast(message, type = 'error') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    const toastTitleText = document.getElementById('toast-title-text');
    
    toastMessage.textContent = message;
    toast.className = 'toast';
    
    // Set icon and title based on type
    if (type === 'success') {
        toast.classList.add('success');
        toastIcon.className = 'fas fa-check-circle';
        toastTitleText.textContent = 'Success';
    } else if (type === 'warning') {
        toast.classList.add('warning');
        toastIcon.className = 'fas fa-exclamation-triangle';
        toastTitleText.textContent = 'Warning';
    } else if (type === 'info') {
        toast.classList.add('info');
        toastIcon.className = 'fas fa-info-circle';
        toastTitleText.textContent = 'Information';
    } else {
        toast.classList.add('error');
        toastIcon.className = 'fas fa-exclamation-circle';
        toastTitleText.textContent = 'Error';
    }
    
    toast.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(hideToast, 5000);
}

// Hide toast notification
function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('hidden');
}

// IP Location Lookup
async function queryIpLocation() {
    const ipInput = document.getElementById('ip-input');
    const resultContainer = document.getElementById('ip-location-result');
    const ip = ipInput.value.trim();

    if (!ip) {
        showToast('Please enter an IP address', 'warning');
        return;
    }

    resultContainer.innerHTML = '<div class="center"><i class="fas fa-spinner fa-spin"></i> Looking up...</div>';
    resultContainer.classList.remove('hidden', 'success', 'error');

    try {
        const response = await fetch(`${apiBaseUrl}/ip-location?ip=${encodeURIComponent(ip)}`);
        const data = await response.json();

        if (data.code === 200) {
            resultContainer.classList.add('success');
            resultContainer.innerHTML = `
                <h3>Location Information</h3>
                <div class="location-info">
                    <span class="label">IP Address:</span>
                    <span class="value">${data.data.ip}</span>
                    <span class="label">Province:</span>
                    <span class="value">${data.data.province || 'Unknown'}</span>
                    <span class="label">City:</span>
                    <span class="value">${data.data.city || 'Unknown'}</span>
                    <span class="label">ISP:</span>
                    <span class="value">${data.data.isp || 'Unknown'}</span>
                </div>
            `;
        } else {
            resultContainer.classList.add('error');
            let errorHtml = `<div class="error-message">${data.message}</div>`;
            
            if (data.detail) {
                errorHtml += `
                    <div class="error-detail">
                        <div>Queried IP: ${data.detail.ip}</div>
                        ${data.detail.note ? `<div>Note: ${data.detail.note}</div>` : ''}
                    </div>
                `;
            }
            
            resultContainer.innerHTML = errorHtml;
        }
    } catch (error) {
        console.error('Error querying IP location:', error);
        resultContainer.classList.add('error');
        resultContainer.innerHTML = `
            <div class="error-message">Lookup Failed</div>
            <div class="error-detail">Error: ${error.message}</div>
        `;
    }
}

// IP Location Test Cases
async function runIpLocationTest(testType) {
    const resultElement = document.getElementById(`ip-location-test-${testType}-result`);
    resultElement.classList.remove('hidden', 'success', 'error');
    resultElement.innerHTML = '<div class="center"><i class="fas fa-spinner fa-spin"></i> Running test...</div>';

    try {
        if (testType === 'basic') {
            // Test with valid IPv4 address
            const testIp = '8.8.8.8';
            const response = await fetch(`${apiBaseUrl}/ip-location?ip=${testIp}`);
            const data = await response.json();

            if (data.code === 200 && data.data) {
                resultElement.classList.add('success');
                resultElement.innerHTML = `✅ Test passed!\n\nResponse:\n${JSON.stringify(data, null, 2)}`;
            } else {
                resultElement.classList.add('error');
                resultElement.innerHTML = `❌ Test failed!\n\nExpected code 200, got:\n${JSON.stringify(data, null, 2)}`;
            }
        } else if (testType === 'error') {
            // Test error cases
            const testCases = [
                { ip: '', desc: 'Empty IP' },
                { ip: 'invalid-ip', desc: 'Invalid IP Format' },
                { ip: '2001:db8::1', desc: 'IPv6 Address' }
            ];

            let results = '';
            for (const test of testCases) {
                const response = await fetch(`${apiBaseUrl}/ip-location?ip=${encodeURIComponent(test.ip)}`);
                const data = await response.json();
                results += `Test Case: ${test.desc}\nResponse:\n${JSON.stringify(data, null, 2)}\n\n`;
            }

            resultElement.classList.add('success');
            resultElement.innerHTML = `✅ Error handling tests completed!\n\n${results}`;
        }
    } catch (error) {
        console.error(`Error running ${testType} IP location test:`, error);
        resultElement.classList.add('error');
        resultElement.innerHTML = `❌ Test failed!\n\nError: ${error.message}`;
    }
}

// 添加回车键触发查询功能
document.getElementById('ip-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        queryIpLocation();
    }
});

// Clear IP location cache
function clearIpLocationCache() {
    ipLocationCache.clear();
    showToast('IP location cache cleared', 'info');
} 