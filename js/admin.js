// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const db = firebase.firestore();
    const auth = firebase.auth();
    const storage = firebase.storage();
    
    // Global variables
    let currentOrders = [];
    let currentMenuItems = [];
    let currentReviews = [];
    let orderStatusChart = null;
    let isSidebarCollapsed = false;
    
    // Check authentication state
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            showAdminPanel();
            initializeAdminDashboard();
            document.getElementById('adminUserName').textContent = user.email;
        } else {
            // User is signed out
            showLoginSection();
        }
    });
    
    // Handle admin login
    document.getElementById('adminLoginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        const errorElement = document.getElementById('loginError');
        
        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Signed in successfully
                errorElement.classList.add('d-none');
            })
            .catch((error) => {
                // Handle errors
                console.error("Login error:", error);
                errorElement.textContent = error.message;
                errorElement.classList.remove('d-none');
            });
    });
    
    // Handle logout
    document.getElementById('adminLogoutBtn').addEventListener('click', function() {
        auth.signOut().catch((error) => {
            console.error("Logout error:", error);
        });
    });
    
    // Show login section
    function showLoginSection() {
        document.getElementById('loginSection').classList.remove('d-none');
        document.getElementById('adminPanel').classList.add('d-none');
    }
    
    // Show admin panel
    function showAdminPanel() {
        document.getElementById('loginSection').classList.add('d-none');
        document.getElementById('adminPanel').classList.remove('d-none');
    }
    
    // Initialize admin dashboard
    function initializeAdminDashboard() {
        // Load all data
        loadOrders();
        loadMenuItems();
        loadReviews();
        
        // Setup navigation
        setupNavigation();
        
        // Setup event listeners
        setupEventListeners();
        
        // Setup sidebar toggle
        setupSidebarToggle();
    }
    
    // Setup sidebar toggle functionality
    function setupSidebarToggle() {
        const sidebar = document.getElementById('sidebar');
        const contentWrapper = document.getElementById('content-wrapper');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const toggleSidebarBtn = document.getElementById('toggleSidebar');
        
        // Mobile sidebar toggle
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function(e) {
                e.preventDefault();
                sidebar.classList.toggle('active');
                contentWrapper.classList.toggle('active');
            });
        }
        
        // Desktop sidebar collapse
        if (toggleSidebarBtn) {
            toggleSidebarBtn.addEventListener('click', function() {
                isSidebarCollapsed = !isSidebarCollapsed;
                
                if (isSidebarCollapsed) {
                    sidebar.style.width = '80px';
                    contentWrapper.style.marginLeft = '80px';
                    toggleSidebarBtn.innerHTML = '<i class="fas fa-chevron-right"></i> Expand';
                    
                    // Hide text in sidebar
                    document.querySelectorAll('.nav-link span').forEach(el => {
                        el.style.display = 'none';
                    });
                    
                    document.querySelectorAll('.sidebar-heading').forEach(el => {
                        el.style.display = 'none';
                    });
                } else {
                    sidebar.style.width = '250px';
                    contentWrapper.style.marginLeft = '250px';
                    toggleSidebarBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Collapse';
                    
                    // Show text in sidebar
                    document.querySelectorAll('.nav-link span').forEach(el => {
                        el.style.display = 'inline';
                    });
                    
                    document.querySelectorAll('.sidebar-heading').forEach(el => {
                        el.style.display = 'block';
                    });
                }
            });
        }
    }
    
    // Setup navigation between sections
    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link[data-section]');
        const sections = document.querySelectorAll('.admin-section');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                const targetSection = this.getAttribute('data-section');
                
                // Update active nav link
                navLinks.forEach(navLink => navLink.classList.remove('active'));
                this.classList.add('active');
                
                // Show target section, hide others
                sections.forEach(section => {
                    if (section.id === targetSection) {
                        section.classList.remove('d-none');
                    } else {
                        section.classList.add('d-none');
                    }
                });
                
                // If on mobile, close sidebar after selection
                if (window.innerWidth < 768) {
                    document.getElementById('sidebar').classList.remove('active');
                    document.getElementById('content-wrapper').classList.remove('active');
                }
            });
        });
    }
    
    // Setup event listeners
    function setupEventListeners() {
        // Order status filter buttons
        document.querySelectorAll('[data-status]').forEach(button => {
            button.addEventListener('click', function() {
                document.querySelectorAll('[data-status]').forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                filterOrders(this.getAttribute('data-status'));
            });
        });
        
        // Add menu item form
        const addMenuItemForm = document.getElementById('addMenuItemForm');
        if (addMenuItemForm) {
            addMenuItemForm.addEventListener('submit', function(e) {
                e.preventDefault();
                addMenuItem();
            });
        }
        
        // Edit menu item form
        const editMenuItemForm = document.getElementById('editMenuItemForm');
        if (editMenuItemForm) {
            editMenuItemForm.addEventListener('submit', function(e) {
                e.preventDefault();
                updateMenuItem();
            });
        }
        
        // Report range form
        const reportRangeForm = document.getElementById('reportRangeForm');
        if (reportRangeForm) {
            reportRangeForm.addEventListener('submit', function(e) {
                e.preventDefault();
                generateReport();
            });
        }
        
        // Quick report buttons
        document.querySelectorAll('[data-range]').forEach(button => {
            button.addEventListener('click', function() {
                generateQuickReport(this.getAttribute('data-range'));
            });
        });
        
        // Status update button
        const updateStatusBtn = document.getElementById('updateStatusBtn');
        if (updateStatusBtn) {
            updateStatusBtn.addEventListener('click', updateOrderStatus);
        }
        
        // Generate invoice button
        const generateInvoiceBtn = document.getElementById('generateInvoiceBtn');
        if (generateInvoiceBtn) {
            generateInvoiceBtn.addEventListener('click', generateInvoice);
        }
        
        // Generate report button
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', function() {
                // Switch to reports section
                document.querySelectorAll('.nav-link[data-section]').forEach(link => link.classList.remove('active'));
                document.querySelector('.nav-link[data-section="reports"]').classList.add('active');
                
                document.querySelectorAll('.admin-section').forEach(section => section.classList.add('d-none'));
                document.getElementById('reports').classList.remove('d-none');
            });
        }
    }
    
    // Load orders from Firebase with real-time updates
    function loadOrders() {
        db.collection('orders').orderBy('orderDate', 'desc').onSnapshot(snapshot => {
            currentOrders = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Convert Firestore timestamp to Date object if it exists
                if (data.orderDate && typeof data.orderDate.toDate === 'function') {
                    data.orderDate = data.orderDate.toDate();
                }
                currentOrders.push({ id: doc.id, ...data });
            });
            
            updateOrdersUI();
            updateDashboardStats();
        }, error => {
            console.error('Error loading orders:', error);
            showToast('Failed to load orders', 'danger');
        });
    }
    
    // Load menu items from Firebase with real-time updates
    function loadMenuItems() {
        db.collection('menu').orderBy('name').onSnapshot(snapshot => {
            currentMenuItems = [];
            snapshot.forEach(doc => {
                currentMenuItems.push({ id: doc.id, ...doc.data() });
            });
            
            updateMenuUI();
        }, error => {
            console.error('Error loading menu items:', error);
            showToast('Failed to load menu items', 'danger');
        });
    }
    
    // Load reviews from Firebase with real-time updates
    function loadReviews() {
        db.collection('reviews').orderBy('reviewDate', 'desc').onSnapshot(snapshot => {
            currentReviews = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // Convert Firestore timestamp to Date object if it exists
                if (data.reviewDate && typeof data.reviewDate.toDate === 'function') {
                    data.reviewDate = data.reviewDate.toDate();
                }
                currentReviews.push({ id: doc.id, ...data });
            });
            
            updateReviewsUI();
        }, error => {
            console.error('Error loading reviews:', error);
            showToast('Failed to load reviews', 'danger');
        });
    }
    
    // Update orders UI
    function updateOrdersUI() {
        const ordersTable = document.getElementById('ordersTable');
        const recentOrdersTable = document.getElementById('recentOrdersTable');
        
        // Clear tables
        if (ordersTable) ordersTable.innerHTML = '';
        if (recentOrdersTable) recentOrdersTable.innerHTML = '';
        
        if (currentOrders.length === 0) {
            if (ordersTable) ordersTable.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            if (recentOrdersTable) recentOrdersTable.innerHTML = '<tr><td colspan="5" class="text-center">No recent orders</td></tr>';
            return;
        }
        
        // Populate orders table
        if (ordersTable) {
            currentOrders.forEach(order => {
                const orderDate = order.orderDate;
                const formattedDate = orderDate.toLocaleDateString();
                const formattedTime = orderDate.toLocaleTimeString();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.id.substring(0, 8)}...</td>
                    <td>${order.customerName}</td>
                    <td>${order.items ? order.items.length + ' item(s)' : 'N/A'}</td>
                    <td>₦${order.total ? order.total.toFixed(2) : '0.00'}</td>
                    <td>${formattedDate} ${formattedTime}</td>
                    <td><span class="badge order-status-badge bg-${getStatusColor(order.status)}">${order.status}</span></td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary view-order" data-id="${order.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                
                ordersTable.appendChild(row);
            });
        }
        
        // Populate recent orders table (only 5 most recent)
        if (recentOrdersTable) {
            // Clear existing content
            recentOrdersTable.innerHTML = '';
            
            currentOrders.slice(0, 5).forEach(order => {
                const orderDate = order.orderDate;
                const formattedDate = orderDate.toLocaleDateString();
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.id.substring(0, 8)}...</td>
                    <td>${order.customerName}</td>
                    <td>₦${order.total ? order.total.toFixed(2) : '0.00'}</td>
                    <td><span class="badge order-status-badge bg-${getStatusColor(order.status)}">${order.status}</span></td>
                    <td class="action-buttons">
                        <button class="btn btn-sm btn-outline-primary view-order" data-id="${order.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                `;
                
                recentOrdersTable.appendChild(row);
            });
        }
        
        // Add event listeners to view order buttons
        document.querySelectorAll('.view-order').forEach(button => {
            button.addEventListener('click', function() {
                const orderId = this.getAttribute('data-id');
                showOrderDetails(orderId);
            });
        });
    }
    
    // Update menu UI
    function updateMenuUI() {
        const menuTable = document.getElementById('menuTable');
        
        // Clear table
        if (!menuTable) return;
        menuTable.innerHTML = '';
        
        if (currentMenuItems.length === 0) {
            menuTable.innerHTML = '<tr><td colspan="6" class="text-center">No menu items found</td></tr>';
            return;
        }
        
        // Populate menu table
        currentMenuItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;"></td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>
                    <small>Small: ₦${item.prices.small}<br>
                    Medium: ₦${item.prices.medium}<br>
                    Large: ₦${item.prices.large}</small>
                </td>
                <td>${item.preparationTime} mins</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-item" data-id="${item.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-item" data-id="${item.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            
            menuTable.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-item').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                showEditMenuItemForm(itemId);
            });
        });
        
        document.querySelectorAll('.delete-item').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                deleteMenuItem(itemId);
            });
        });
    }
    
    // Update reviews UI
    function updateReviewsUI() {
        const reviewsTable = document.getElementById('reviewsTable');
        
        // Clear table
        if (!reviewsTable) return;
        reviewsTable.innerHTML = '';
        
        if (currentReviews.length === 0) {
            reviewsTable.innerHTML = '<tr><td colspan="6" class="text-center">No reviews found</td></tr>';
            return;
        }
        
        // Populate reviews table
        currentReviews.forEach(review => {
            const reviewDate = review.reviewDate;
            const formattedDate = reviewDate.toLocaleDateString();
            
            // Generate stars based on rating
            let stars = '';
            for (let i = 0; i < 5; i++) {
                if (i < review.rating) {
                    stars += '<i class="fas fa-star text-warning"></i>';
                } else {
                    stars += '<i class="far fa-star text-warning"></i>';
                }
            }
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${review.customerName}</td>
                <td>${review.orderId.substring(0, 8)}...</td>
                <td>${stars}</td>
                <td>${review.comment}</td>
                <td>${formattedDate}</td>
                <td>
                    ${review.bonusCoin ? 
                        `<span class="badge bg-success">${review.bonusCoin}</span>` : 
                        `<button class="btn btn-sm btn-outline-success generate-coin" data-id="${review.id}">Generate</button>`
                    }
                </td>
            `;
            
            reviewsTable.appendChild(row);
        });
        
        // Add event listeners to generate coin buttons
        document.querySelectorAll('.generate-coin').forEach(button => {
            button.addEventListener('click', function() {
                const reviewId = this.getAttribute('data-id');
                generateBonusCoin(reviewId);
            });
        });
    }
    
    // Update dashboard statistics
    function updateDashboardStats() {
        const totalOrders = currentOrders.length;
        const pendingOrders = currentOrders.filter(order => order.status === 'pending').length;
        const completedOrders = currentOrders.filter(order => order.status === 'completed').length;
        const totalRevenue = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
        
        document.getElementById('totalOrdersCount').textContent = totalOrders;
        document.getElementById('pendingOrdersCount').textContent = pendingOrders;
        document.getElementById('completedOrdersCount').textContent = completedOrders;
        document.getElementById('totalRevenue').textContent = `₦${totalRevenue.toFixed(2)}`;
        
        // Update order status chart
        updateOrderStatusChart();
    }
    
    // Update order status chart
    function updateOrderStatusChart() {
        const statusCounts = {
            pending: currentOrders.filter(order => order.status === 'pending').length,
            preparing: currentOrders.filter(order => order.status === 'preparing').length,
            delivering: currentOrders.filter(order => order.status === 'delivering').length,
            completed: currentOrders.filter(order => order.status === 'completed').length
        };
        
        const ctx = document.getElementById('orderStatusChart');
        if (!ctx) return;
        
        // Destroy existing chart if it exists
        if (orderStatusChart) {
            orderStatusChart.destroy();
        }
        
        // Create new chart
        orderStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Preparing', 'Delivering', 'Completed'],
                datasets: [{
                    data: [statusCounts.pending, statusCounts.preparing, statusCounts.delivering, statusCounts.completed],
                    backgroundColor: [
                        '#f6c23e',
                        '#36b9cc',
                        '#4e73df',
                        '#1cc88a'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
    
    // Filter orders by status
    function filterOrders(status) {
        const ordersTable = document.getElementById('ordersTable');
        if (!ordersTable) return;
        
        // Clear table
        ordersTable.innerHTML = '';
        
        if (currentOrders.length === 0) {
            ordersTable.innerHTML = '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
            return;
        }
        
        // Filter orders
        const filteredOrders = status === 'all' 
            ? currentOrders 
            : currentOrders.filter(order => order.status === status);
        
        if (filteredOrders.length === 0) {
            ordersTable.innerHTML = '<tr><td colspan="7" class="text-center">No orders found with this status</td></tr>';
            return;
        }
        
        // Populate table with filtered orders
        filteredOrders.forEach(order => {
            const orderDate = order.orderDate;
            const formattedDate = orderDate.toLocaleDateString();
            const formattedTime = orderDate.toLocaleTimeString();
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order.id.substring(0, 8)}...</td>
                <td>${order.customerName}</td>
                <td>${order.items ? order.items.length + ' item(s)' : 'N/A'}</td>
                <td>₦${order.total ? order.total.toFixed(2) : '0.00'}</td>
                <td>${formattedDate} ${formattedTime}</td>
                <td><span class="badge order-status-badge bg-${getStatusColor(order.status)}">${order.status}</span></td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary view-order" data-id="${order.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            
            ordersTable.appendChild(row);
        });
        
        // Add event listeners to view order buttons
        document.querySelectorAll('.view-order').forEach(button => {
            button.addEventListener('click', function() {
                const orderId = this.getAttribute('data-id');
                showOrderDetails(orderId);
            });
        });
    }
    
    // Show order details - UPDATED TO HANDLE ARRAY OF ITEMS
    function showOrderDetails(orderId) {
        const order = currentOrders.find(o => o.id === orderId);
        if (!order) return;

        const modalElement = document.getElementById('orderDetailsModal');
        if (!modalElement) return;

        const modal = new bootstrap.Modal(modalElement);
        const orderDate = order.orderDate;

        // Populate order details
        document.getElementById('orderDetailId').textContent = orderId.substring(0, 8) + '...';
        document.getElementById('orderCustomerName').textContent = order.customerName;
        document.getElementById('orderCustomerPhone').textContent = order.customerPhone;
        document.getElementById('orderCustomerAddress').textContent = order.customerAddress;
        document.getElementById('orderDate').textContent = orderDate.toLocaleString();
        document.getElementById('orderStatus').textContent = order.status;
        document.getElementById('orderStatus').className = `badge bg-${getStatusColor(order.status)}`;
        document.getElementById('orderTotalAmount').textContent = `₦${order.total ? order.total.toFixed(2) : '0.00'}`;

        // Populate order items - UPDATED FOR ARRAY
        const orderItemsList = document.getElementById('orderItemsList');
        orderItemsList.innerHTML = '';
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'card mb-2';
                itemElement.innerHTML = `
                    <div class="card-body">
                        <h6>${item.name} (${item.size})</h6>
                        <p>Quantity: ${item.quantity}</p>
                        <p>Unit Price: ₦${item.price ? item.price.toFixed(2) : '0.00'}</p>
                        <p>Total: ₦${item.total ? item.total.toFixed(2) : '0.00'}</p>
                    </div>
                `;
                orderItemsList.appendChild(itemElement);
            });
        } else {
            // Fallback for old order structure
            orderItemsList.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h6>${order.menuItemName || 'Unknown Item'} (${order.size || 'N/A'})</h6>
                        <p>Quantity: ${order.quantity || '1'}</p>
                        <p>Unit Price: ₦${order.unitPrice ? order.unitPrice.toFixed(2) : '0.00'}</p>
                        <p>Total: ₦${order.totalPrice ? order.totalPrice.toFixed(2) : '0.00'}</p>
                    </div>
                </div>
            `;
        }

        // Populate payment proof
        const paymentProofContainer = document.getElementById('paymentProofContainer');
        if (order.paymentProofBase64) {
            // Display Base64 image
            paymentProofContainer.innerHTML = `
                <div class="mb-3">
                    <img src="${order.paymentProofBase64}" alt="Payment Proof" 
                        class="img-fluid rounded shadow-sm" style="max-height: 300px;">
                </div>
                <div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="copyToClipboard('${order.paymentProofBase64}')">
                        <i class="fas fa-copy me-1"></i> Copy Image Data
                    </button>
                </div>
            `;
        } else if (order.paymentProofURL) {
            // Display URL image (for backward compatibility)
            paymentProofContainer.innerHTML = `
                <div class="mb-3">
                    <img src="${order.paymentProofURL}" alt="Payment Proof" 
                        class="img-fluid rounded shadow-sm" style="max-height: 300px;">
                </div>
                <div>
                    <a href="${order.paymentProofURL}" target="_blank" class="btn btn-outline-primary btn-sm">
                        <i class="fas fa-external-link-alt me-1"></i> Open in New Tab
                    </a>
                    <button class="btn btn-outline-secondary btn-sm" onclick="copyToClipboard('${order.paymentProofURL}')">
                        <i class="fas fa-copy me-1"></i> Copy Link
                    </button>
                </div>
            `;
        } else {
            paymentProofContainer.innerHTML = '<p class="text-muted">No payment proof available</p>';
        }

        // Set current order ID for status update
        document.getElementById('statusUpdateSelect').value = order.status;
        document.getElementById('updateStatusBtn').setAttribute('data-id', orderId);

        // Set current order ID for invoice generation
        document.getElementById('generateInvoiceBtn').setAttribute('data-id', orderId);

        modal.show();
    }

    // Helper function to copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Link copied to clipboard', 'success');
        }).catch(err => {
            console.error('Failed to copy: ', err);
            showToast('Failed to copy link', 'danger');
        });
    }

    // Make it available globally
    window.copyToClipboard = copyToClipboard;
    
    // Update order status
    function updateOrderStatus() {
        const orderId = this.getAttribute('data-id');
        const newStatus = document.getElementById('statusUpdateSelect').value;
        
        db.collection('orders').doc(orderId).update({
            status: newStatus
        }).then(() => {
            showToast('Order status updated successfully', 'success');
            
            // If status is set to completed, check if we need to create a review entry
            if (newStatus === 'completed') {
                const order = currentOrders.find(o => o.id === orderId);
                if (order && !order.completed) {
                    // Mark order as completed
                    db.collection('orders').doc(orderId).update({
                        completed: true
                    });
                    
                    // Create a review entry if it doesn't exist
                    db.collection('reviews').where('orderId', '==', orderId).get()
                        .then(snapshot => {
                            if (snapshot.empty) {
                                db.collection('reviews').add({
                                    orderId: orderId,
                                    customerName: order.customerName,
                                    rating: 0,
                                    comment: '',
                                    reviewDate: new Date(),
                                    bonusCoin: null
                                });
                            }
                        });
                }
            }
        }).catch(error => {
            console.error('Error updating order status:', error);
            showToast('Failed to update order status', 'danger');
        });
    }
    
    // Generate invoice
    function generateInvoice() {
        const orderId = this.getAttribute('data-id');
        const order = currentOrders.find(o => o.id === orderId);
        if (!order) return;
        
        const orderDate = order.orderDate;
        const invoicePreview = document.getElementById('invoicePreview');
        
        // Create invoice HTML
        invoicePreview.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <div class="text-center mb-4">
                        <h3>Manai Restaurant</h3>
                        <p class="mb-0">123 Main Street, Demba, Nigeria</p>
                        <p>Phone: +234 123 456 7890</p>
                    </div>
                    
                    <div class="row mb-4">
                        <div class="col-md-6">
                            <h5>Invoice</h5>
                            <p><strong>Order ID:</strong> ${orderId}</p>
                            <p><strong>Date:</strong> ${orderDate.toLocaleDateString()}</p>
                        </div>
                        <div class="col-md-6">
                            <h5>Customer Information</h5>
                            <p><strong>Name:</strong> ${order.customerName}</p>
                            <p><strong>Phone:</strong> ${order.customerPhone}</p>
                            <p><strong>Address:</strong> ${order.customerAddress}</p>
                        </div>
                    </div>
                    
                    <table class="table table-bordered">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>`;
        
        // Add items to invoice - UPDATED FOR ARRAY
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                invoicePreview.innerHTML += `
                    <tr>
                        <td>${item.name} (${item.size})</td>
                        <td>${item.quantity}</td>
                        <td>₦${item.price ? item.price.toFixed(2) : '0.00'}</td>
                        <td>₦${item.total ? item.total.toFixed(2) : '0.00'}</td>
                    </tr>
                `;
            });
        } else {
            // Fallback for old order structure
            invoicePreview.innerHTML += `
                <tr>
                    <td>${order.menuItemName || 'Unknown Item'} (${order.size || 'N/A'})</td>
                    <td>${order.quantity || '1'}</td>
                    <td>₦${order.unitPrice ? order.unitPrice.toFixed(2) : '0.00'}</td>
                    <td>₦${order.totalPrice ? order.totalPrice.toFixed(2) : '0.00'}</td>
                </tr>
            `;
        }
        
        invoicePreview.innerHTML += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="3" class="text-end">Subtotal:</th>
                                <th>₦${order.subtotal ? order.subtotal.toFixed(2) : '0.00'}</th>
                            </tr>
                            <tr>
                                <th colspan="3" class="text-end">Delivery Fee:</th>
                                <th>₦${order.deliveryFee ? order.deliveryFee.toFixed(2) : '0.00'}</th>
                            </tr>
                            <tr>
                                <th colspan="3" class="text-end">Total:</th>
                                <th>₦${order.total ? order.total.toFixed(2) : '0.00'}</th>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div class="mt-4">
                        <p>Thank you for your order!</p>
                        <p>Payment Method: Bank Transfer</p>
                        <p>Status: ${order.status}</p>
                    </div>
                </div>
            </div>
            
            <div class="text-center mt-3">
                <button class="btn btn-primary" onclick="printInvoice()">
                    <i class="fas fa-print me-1"></i> Print Invoice
                </button>
            </div>
        `;
        
        invoicePreview.classList.remove('d-none');
    }
    
    // Print invoice (global function for onclick)
    window.printInvoice = function() {
        const invoiceContent = document.getElementById('invoicePreview').innerHTML;
        const originalContent = document.body.innerHTML;
        
        document.body.innerHTML = invoiceContent;
        window.print();
        document.body.innerHTML = originalContent;
        
        // Reload the page to restore functionality
        location.reload();
    };
    
    // Add menu item
    function addMenuItem() {
        const name = document.getElementById('itemName').value;
        const category = document.getElementById('itemCategory').value;
        const description = document.getElementById('itemDescription').value;
        const image = document.getElementById('itemImage').value;
        const preparationTime = parseInt(document.getElementById('itemPrepTime').value);
        const prices = {
            small: parseFloat(document.getElementById('priceSmall').value),
            medium: parseFloat(document.getElementById('priceMedium').value),
            large: parseFloat(document.getElementById('priceLarge').value)
        };
        
        db.collection('menu').add({
            name,
            category,
            description,
            image,
            preparationTime,
            prices
        }).then(() => {
            // Close modal and reset form
            const modal = bootstrap.Modal.getInstance(document.getElementById('addMenuItemModal'));
            modal.hide();
            document.getElementById('addMenuItemForm').reset();
            
            showToast('Menu item added successfully', 'success');
        }).catch(error => {
            console.error('Error adding menu item:', error);
            showToast('Failed to add menu item', 'danger');
        });
    }
    
    // Show edit menu item form
    function showEditMenuItemForm(itemId) {
        const item = currentMenuItems.find(i => i.id === itemId);
        if (!item) return;
        
        // Populate form
        document.getElementById('editItemId').value = itemId;
        document.getElementById('editItemName').value = item.name;
        document.getElementById('editItemCategory').value = item.category;
        document.getElementById('editItemDescription').value = item.description;
        document.getElementById('editItemImage').value = item.image;
        document.getElementById('editItemPrepTime').value = item.preparationTime;
        document.getElementById('editPriceSmall').value = item.prices.small;
        document.getElementById('editPriceMedium').value = item.prices.medium;
        document.getElementById('editPriceLarge').value = item.prices.large;
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('editMenuItemModal'));
        modal.show();
    }
    
    // Update menu item
    function updateMenuItem() {
        const itemId = document.getElementById('editItemId').value;
        const name = document.getElementById('editItemName').value;
        const category = document.getElementById('editItemCategory').value;
        const description = document.getElementById('editItemDescription').value;
        const image = document.getElementById('editItemImage').value;
        const preparationTime = parseInt(document.getElementById('editItemPrepTime').value);
        const prices = {
            small: parseFloat(document.getElementById('editPriceSmall').value),
            medium: parseFloat(document.getElementById('editPriceMedium').value),
            large: parseFloat(document.getElementById('editPriceLarge').value)
        };
        
        db.collection('menu').doc(itemId).update({
            name,
            category,
            description,
            image,
            preparationTime,
            prices
        }).then(() => {
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('editMenuItemModal'));
            modal.hide();
            
            showToast('Menu item updated successfully', 'success');
        }).catch(error => {
            console.error('Error updating menu item:', error);
            showToast('Failed to update menu item', 'danger');
        });
    }
    
    // Delete menu item
    function deleteMenuItem(itemId) {
        if (!confirm('Are you sure you want to delete this menu item?')) return;
        
        db.collection('menu').doc(itemId).delete()
            .then(() => {
                showToast('Menu item deleted successfully', 'success');
            })
            .catch(error => {
                console.error('Error deleting menu item:', error);
                showToast('Failed to delete menu item', 'danger');
            });
    }
    
    // Generate bonus coin for review
    function generateBonusCoin(reviewId) {
        const review = currentReviews.find(r => r.id === reviewId);
        if (!review) return;
        
        // Generate a random 8-character bonus coin
        const bonusCoin = 'MN' + Math.random().toString(36).substring(2, 10).toUpperCase();
        
        db.collection('reviews').doc(reviewId).update({
            bonusCoin
        }).then(() => {
            showToast('Bonus coin generated successfully', 'success');
        }).catch(error => {
            console.error('Error generating bonus coin:', error);
            showToast('Failed to generate bonus coin', 'danger');
        });
    }
    
    // Generate report based on date range
    function generateReport() {
        const startDate = new Date(document.getElementById('startDate').value);
        const endDate = new Date(document.getElementById('endDate').value);
        
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            showToast('Please select valid dates', 'warning');
            return;
        }
        
        // Adjust end date to include the entire day
        endDate.setHours(23, 59, 59, 999);
        
        const filteredOrders = currentOrders.filter(order => {
            const orderDate = order.orderDate;
            return orderDate >= startDate && orderDate <= endDate;
        });
        
        updateReportUI(filteredOrders);
    }
    
    // Generate quick report
    function generateQuickReport(range) {
        const now = new Date();
        let startDate;
        
        switch (range) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'all':
                startDate = new Date(0); // Unix epoch
                break;
            default:
                startDate = new Date(0);
        }
        
        const filteredOrders = currentOrders.filter(order => {
            const orderDate = order.orderDate;
            return orderDate >= startDate;
        });
        
        updateReportUI(filteredOrders);
    }
    
    // Update report UI
    function updateReportUI(orders) {
        const totalOrders = orders.length;
        const completedOrders = orders.filter(order => order.status === 'completed').length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        document.getElementById('reportTotalOrders').textContent = totalOrders;
        document.getElementById('reportTotalRevenue').textContent = `₦${totalRevenue.toFixed(2)}`;
        document.getElementById('reportAvgOrder').textContent = `₦${avgOrderValue.toFixed(2)}`;
        document.getElementById('reportCompletedOrders').textContent = completedOrders;
        
        // Calculate top menu items
        const menuItemCounts = {};
        orders.forEach(order => {
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    if (!menuItemCounts[item.name]) {
                        menuItemCounts[item.name] = {
                            quantity: 0,
                            revenue: 0
                        };
                    }
                    
                    menuItemCounts[item.name].quantity += item.quantity;
                    menuItemCounts[item.name].revenue += item.total;
                });
            }
            // Fallback for old order structure
            else if (order.menuItemName) {
                if (!menuItemCounts[order.menuItemName]) {
                    menuItemCounts[order.menuItemName] = {
                        quantity: 0,
                        revenue: 0
                    };
                }
                
                menuItemCounts[order.menuItemName].quantity += order.quantity;
                menuItemCounts[order.menuItemName].revenue += order.totalPrice;
            }
        });
        
        // Convert to array and sort by revenue
        const topMenuItems = Object.entries(menuItemCounts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue);
        
        // Update top menu items table
        const topMenuItemsTable = document.getElementById('topMenuItemsTable');
        if (!topMenuItemsTable) return;
        topMenuItemsTable.innerHTML = '';
        
        if (topMenuItems.length === 0) {
            topMenuItemsTable.innerHTML = '<tr><td colspan="3" class="text-center">No data available</td></tr>';
            return;
        }
        
        topMenuItems.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>₦${item.revenue.toFixed(2)}</td>
            `;
            topMenuItemsTable.appendChild(row);
        });
    }
    
    // Helper function to get status color
    function getStatusColor(status) {
        switch (status) {
            case 'pending': return 'warning';
            case 'preparing': return 'info';
            case 'delivering': return 'primary';
            case 'completed': return 'success';
            default: return 'secondary';
        }
    }
    
    // Show toast notification
    function showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toastContainer');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toastContainer';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        toast.setAttribute('aria-atomic', 'true');
        

        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Initialize and show toast
        const bsToast = new bootstrap.Toast(toast, {
            autohide: true,
            delay: 5000
        });
        bsToast.show();
        
        // Remove toast from DOM after it's hidden
        toast.addEventListener('hidden.bs.toast', function() {
            toast.remove();
        });
    }
});