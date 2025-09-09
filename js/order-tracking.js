// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Firebase references
    const db = firebase.firestore();
    
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
                    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
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
    
    // Set loading state for button
    function setLoadingState(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<div class="loading-spinner"></div> Tracking...';
        } else {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-search me-1"></i> Track Order';
        }
    }
    
    // Update progress steps based on status
    function updateProgressSteps(status) {
        // Reset all steps
        document.querySelectorAll('.tracking-step').forEach(step => {
            step.classList.remove('step-active', 'step-completed');
        });
        
        // Set completed and active steps based on status
        const statusSteps = {
            'pending': ['stepPending'],
            'preparing': ['stepPending', 'stepPreparing'],
            'delivering': ['stepPending', 'stepPreparing', 'stepDelivering'],
            'completed': ['stepPending', 'stepPreparing', 'stepDelivering', 'stepCompleted']
        };
        
        if (statusSteps[status]) {
            statusSteps[status].forEach(stepId => {
                document.getElementById(stepId).classList.add('step-completed');
            });
            
            // Set current step as active
            const currentStep = status === 'pending' ? 'stepPending' :
                              status === 'preparing' ? 'stepPreparing' :
                              status === 'delivering' ? 'stepDelivering' : 'stepCompleted';
            document.getElementById(currentStep).classList.add('step-active');
        }
    }
    
    // Calculate delivery time remaining
    function calculateDeliveryTime(orderDate, estimatedMinutes) {
        const orderTime = orderDate.toDate();
        const estimatedDelivery = new Date(orderTime.getTime() + estimatedMinutes * 60000);
        const now = new Date();
        
        if (now >= estimatedDelivery) {
            return "Delivered";
        }
        
        const diffMs = estimatedDelivery - now;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        
        if (diffHours > 0) {
            return `${diffHours}h ${remainingMins}m`;
        } else {
            return `${remainingMins} minutes`;
        }
    }
    
    // Handle form submission
    document.getElementById('trackOrderForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const orderId = document.getElementById('orderIdInput').value.trim();
        const trackButton = document.getElementById('trackOrderBtn');
        
        if (!orderId) {
            showToast('Please enter an Order ID', 'warning');
            return;
        }
        
        setLoadingState(trackButton, true);
        
        try {
            // Get order from Firestore
            const doc = await db.collection('orders').doc(orderId).get();
            
            if (!doc.exists) {
                document.getElementById('orderDetails').classList.add('d-none');
                document.getElementById('orderNotFound').classList.remove('d-none');
                showToast('Order not found', 'warning');
                return;
            }
            
            const order = doc.data();
            
            // Populate order details
            document.getElementById('trackingOrderId').textContent = orderId;
            document.getElementById('trackingCustomerName').textContent = order.customerName;
            document.getElementById('trackingCustomerPhone').textContent = order.customerPhone;
            document.getElementById('trackingCustomerAddress').textContent = order.customerAddress;
            document.getElementById('trackingOrderDate').textContent = order.orderDate.toDate().toLocaleString();
            document.getElementById('trackingOrderTotal').textContent = `₦${order.total.toFixed(2)}`;
            
            // Set status badge
            const statusBadge = document.getElementById('trackingOrderStatus');
            statusBadge.textContent = order.status;
            statusBadge.className = `badge bg-${getStatusColor(order.status)}`;
            
            // Populate order items
            const orderItemsContainer = document.getElementById('trackingOrderItems');
            orderItemsContainer.innerHTML = '';
            
            if (order.items && order.items.length > 0) {
                order.items.forEach(item => {
                    const itemElement = document.createElement('div');
                    itemElement.className = 'card mb-2';
                    itemElement.innerHTML = `
                        <div class="card-body py-2">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 class="mb-0">${item.name} (${item.size})</h6>
                                    <small class="text-muted">₦${item.price.toFixed(2)} x ${item.quantity}</small>
                                </div>
                                <span class="fw-bold">₦${item.total.toFixed(2)}</span>
                            </div>
                        </div>
                    `;
                    orderItemsContainer.appendChild(itemElement);
                });
            }
            
            // Update progress steps
            updateProgressSteps(order.status);
            
            // Update delivery estimate
            if (order.status !== 'completed') {
                const deliveryTime = calculateDeliveryTime(order.orderDate, order.estimatedDelivery || 45);
                document.getElementById('deliveryTimeRemaining').textContent = deliveryTime;
            } else {
                document.getElementById('deliveryTimeRemaining').textContent = 'Delivered';
                document.getElementById('deliveryEstimate').classList.add('text-success');
            }
            
            // Show order details
            document.getElementById('orderDetails').classList.remove('d-none');
            document.getElementById('orderNotFound').classList.add('d-none');
            
            showToast('Order details loaded', 'success');
            
        } catch (error) {
            console.error('Error tracking order:', error);
            showToast('Failed to track order. Please try again.', 'danger');
        } finally {
            setLoadingState(trackButton, false);
        }
    });
    
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
});