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
    
    // Set loading state for button
    function setLoadingState(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div> Tracking...';
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
    
    // Calculate delivery time remaining with automatic updates
    function calculateDeliveryTime(orderDate, estimatedMinutes, status) {
        if (status === 'completed') {
            return "Delivered";
        }
        
        const orderTime = orderDate.toDate();
        const estimatedDelivery = new Date(orderTime.getTime() + estimatedMinutes * 60000);
        const now = new Date();
        
        if (now >= estimatedDelivery && status !== 'completed') {
            return "Should be delivered soon";
        }
        
        const diffMs = estimatedDelivery - now;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        
        if (diffHours > 0) {
            return `${diffHours}h ${remainingMins}m remaining`;
        } else if (remainingMins > 0) {
            return `${remainingMins} minutes remaining`;
        } else {
            return "Arriving soon";
        }
    }
    
    // Handle form submission
    document.getElementById('trackOrderForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const orderId = document.getElementById('orderIdInput').value.trim();
        const customerPhone = document.getElementById('customerPhoneVerify').value.trim();
        const trackButton = document.getElementById('trackOrderBtn');
        
        if (!orderId) {
            showToast('Please enter an Order ID', 'warning');
            return;
        }
        
        if (!customerPhone) {
            showToast('Please enter your phone number', 'warning');
            return;
        }
        
        setLoadingState(trackButton, true);
        
        try {
            // Get order from Firestore with phone verification
            const doc = await db.collection('orders').doc(orderId).get();
            
            if (!doc.exists) {
                document.getElementById('orderDetails').classList.add('d-none');
                document.getElementById('orderNotFound').classList.remove('d-none');
                showToast('Order not found', 'warning');
                setLoadingState(trackButton, false);
                return;
            }
            
            const order = doc.data();
            
            // Verify phone number matches
            if (order.customerPhone !== customerPhone) {
                document.getElementById('orderDetails').classList.add('d-none');
                document.getElementById('orderNotFound').classList.remove('d-none');
                showToast('Order not found or phone number does not match', 'warning');
                setLoadingState(trackButton, false);
                return;
            }
            
            // Convert Firestore timestamp to Date if needed
            if (order.orderDate && typeof order.orderDate.toDate === 'function') {
                order.orderDate = order.orderDate.toDate();
            }
            
            // Populate order details
            document.getElementById('trackingOrderId').textContent = orderId;
            document.getElementById('trackingCustomerName').textContent = order.customerName;
            document.getElementById('trackingCustomerPhone').textContent = order.customerPhone;
            document.getElementById('trackingCustomerAddress').textContent = order.customerAddress;
            document.getElementById('trackingOrderDate').textContent = order.orderDate.toLocaleString();
            document.getElementById('trackingOrderTotal').textContent = `₦${order.total ? order.total.toFixed(2) : '0.00'}`;
            
            // Set status badge
            const statusBadge = document.getElementById('trackingOrderStatus');
            statusBadge.textContent = order.status;
            statusBadge.className = `badge bg-${getStatusColor(order.status)}`;
            
            // Populate order items in a table format
            const orderItemsContainer = document.getElementById('trackingOrderItems');
            orderItemsContainer.innerHTML = '';
            
            if (order.items && order.items.length > 0) {
                orderItemsContainer.innerHTML = `
                    <div class="table-responsive">
                        <table class="table table-bordered">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th class="text-center">Size</th>
                                    <th class="text-center">Qty</th>
                                    <th class="text-end">Price (₦)</th>
                                    <th class="text-end">Total (₦)</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                order.items.forEach(item => {
                    orderItemsContainer.innerHTML += `
                        <tr>
                            <td>${item.name}</td>
                            <td class="text-center">${item.size}</td>
                            <td class="text-center">${item.quantity}</td>
                            <td class="text-end">${item.price ? item.price.toFixed(2) : '0.00'}</td>
                            <td class="text-end">${item.total ? item.total.toFixed(2) : '0.00'}</td>
                        </tr>
                    `;
                });
                
                orderItemsContainer.innerHTML += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            // Update progress steps
            updateProgressSteps(order.status);
            
            // Update delivery estimate with auto-refresh
            function updateDeliveryTime() {
                const deliveryTime = calculateDeliveryTime(order.orderDate, order.estimatedDelivery || 45, order.status);
                document.getElementById('deliveryTimeRemaining').textContent = deliveryTime;
                
                if (order.status !== 'completed') {
                    // Keep updating every minute
                    setTimeout(updateDeliveryTime, 60000);
                }
            }
            
            updateDeliveryTime();
            
            if (order.status === 'completed') {
                document.getElementById('deliveryTimeRemaining').textContent = 'Delivered';
                document.getElementById('deliveryEstimate').classList.add('text-success');
            }
            
            // Show order details
            document.getElementById('orderDetails').classList.remove('d-none');
            document.getElementById('orderNotFound').classList.add('d-none');
            
            showToast('Order details loaded', 'success');
            
        } catch (error) {
            console.error('Error tracking order:', error);
            if (error.code === 'permission-denied') {
                showToast('Access denied. Please check your phone number and try again.', 'danger');
            } else {
                showToast('Failed to track order. Please try again.', 'danger');
            }
        } finally {
            setLoadingState(trackButton, false);
        }
    });
});