// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let selectedMenu = null;
    let selectedSize = '';
    let currentPrice = 0;
    let cartItems = [];
    
    // Firebase references
    const db = firebase.firestore();
    
    // Check if a specific menu item was requested via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const requestedItem = urlParams.get('item');
    const requestedItemSize = urlParams.get('size');
    
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
    
    // Load menu items from Firebase
    function loadMenuItems() {
        const menuSelect = document.getElementById('menuSelect');
        
        // Clear existing options except the first one
        while (menuSelect.options.length > 1) {
            menuSelect.remove(1);
        }
        
        // Show loading state
        const loadingOption = document.createElement('option');
        loadingOption.value = '';
        loadingOption.textContent = 'Loading menu items...';
        loadingOption.disabled = true;
        menuSelect.appendChild(loadingOption);
        
        // Get menu items from Firestore
        db.collection('menu').orderBy('name').get().then((querySnapshot) => {
            // Remove loading option
            menuSelect.remove(menuSelect.options.length - 1);
            
            if (querySnapshot.empty) {
                const noItemsOption = document.createElement('option');
                noItemsOption.value = '';
                noItemsOption.textContent = 'No menu items available';
                noItemsOption.disabled = true;
                menuSelect.appendChild(noItemsOption);
                return;
            }
            
            querySnapshot.forEach((doc) => {
                const menuItem = doc.data();
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = menuItem.name;
                option.dataset.prices = JSON.stringify(menuItem.prices);
                option.dataset.description = menuItem.description;
                option.dataset.preparationTime = menuItem.preparationTime;
                menuSelect.appendChild(option);
                
                // If this is the requested item, select it and auto-add to cart
                if (requestedItem && doc.id === requestedItem) {
                    menuSelect.value = doc.id;
                    triggerEvent(menuSelect, 'change');
                    
                    // Auto-select size if provided
                    if (requestedItemSize) {
                        setTimeout(() => {
                            const sizeBtn = document.querySelector(`[data-size="${requestedItemSize}"]`);
                            if (sizeBtn) sizeBtn.click();
                            
                            // Auto-add to cart after a delay
                            setTimeout(() => {
                                addToCart();
                                showToast('Item added to cart from your previous selection', 'success');
                            }, 500);
                        }, 300);
                    }
                }
            });
        }).catch((error) => {
            console.error("Error loading menu items: ", error);
            menuSelect.remove(menuSelect.options.length - 1);
            
            const errorOption = document.createElement('option');
            errorOption.value = '';
            errorOption.textContent = 'Failed to load menu items';
            errorOption.disabled = true;
            menuSelect.appendChild(errorOption);
            
            showToast('Failed to load menu. Please check your connection.', 'danger');
        });
    }
    
    // Helper function to trigger events
    function triggerEvent(element, eventName) {
        const event = new Event(eventName, {
            bubbles: true,
            cancelable: true,
        });
        element.dispatchEvent(event);
    }
    
    // Handle menu selection change
    document.getElementById('menuSelect').addEventListener('change', function(e) {
        const selectedOption = e.target.options[e.target.selectedIndex];
        
        if (e.target.value) {
            // Get menu details from selected option
            const menuItem = {
                id: e.target.value,
                name: selectedOption.text,
                prices: JSON.parse(selectedOption.dataset.prices),
                description: selectedOption.dataset.description,
                preparationTime: selectedOption.dataset.preparationTime
            };
            
            selectedMenu = menuItem;
            displayMenuDetails(selectedMenu);
        } else {
            document.getElementById('menuDetails').classList.add('d-none');
        }
    });
    
    // Display menu details and size options
    function displayMenuDetails(menuItem) {
        const menuDetails = document.getElementById('menuDetails');
        const selectedMenuName = document.getElementById('selectedMenuName');
        const selectedMenuDescription = document.getElementById('selectedMenuDescription');
        const sizeOptions = document.getElementById('sizeOptions');
        
        // Set menu name and description
        selectedMenuName.textContent = menuItem.name;
        selectedMenuDescription.textContent = menuItem.description;
        
        // Clear existing size options
        sizeOptions.innerHTML = '';
        
        // Add size options
        Object.keys(menuItem.prices).forEach(size => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-primary size-option';
            button.textContent = `${size.charAt(0).toUpperCase() + size.slice(1)} (₦${menuItem.prices[size]})`;
            button.dataset.size = size;
            button.dataset.price = menuItem.prices[size];
            
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                document.querySelectorAll('#sizeOptions .btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Add active class to clicked button
                this.classList.add('active');
                
                // Set selected size and price
                selectedSize = this.dataset.size;
                currentPrice = parseFloat(this.dataset.price);
            });
            
            sizeOptions.appendChild(button);
        });
        
        // Auto-select medium size if available
        const mediumButton = sizeOptions.querySelector('[data-size="medium"]');
        if (mediumButton) {
            mediumButton.click();
        } else if (sizeOptions.firstChild) {
            // Select the first available size
            sizeOptions.firstChild.click();
        }
        
        // Show menu details
        menuDetails.classList.remove('d-none');
    }
    
    // Add to cart functionality - FIXED VERSION
    function addToCart() {
        if (!selectedMenu || !selectedSize) {
            showToast('Please select a menu item and size', 'warning');
            return;
        }
        
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const itemTotal = currentPrice * quantity;
        
        // Check if item already exists in cart
        const existingItemIndex = cartItems.findIndex(item => 
            item.menuId === selectedMenu.id && item.size === selectedSize
        );
        
        if (existingItemIndex !== -1) {
            // Update quantity if item already exists
            cartItems[existingItemIndex].quantity += quantity;
            cartItems[existingItemIndex].total = cartItems[existingItemIndex].price * cartItems[existingItemIndex].quantity;
            showToast(`Updated quantity for ${selectedMenu.name} (${selectedSize})`, 'info');
        } else {
            // Create new cart item
            const cartItem = {
                id: Date.now(), // Unique ID for cart item
                menuId: selectedMenu.id,
                name: selectedMenu.name,
                size: selectedSize,
                price: currentPrice,
                quantity: quantity,
                total: itemTotal
            };
            
            // Add to cart array
            cartItems.push(cartItem);
            showToast(`${quantity} x ${selectedMenu.name} (${selectedSize}) added to cart`, 'success');
        }
        
        // Update cart UI
        updateCartUI();
        
        // Reset quantity
        document.getElementById('quantity').value = 1;
    }
    
    // Update cart UI
    function updateCartUI() {
        const cartItemsContainer = document.getElementById('cartItems');
        const emptyCartMessage = document.getElementById('emptyCartMessage');
        const cartTotalElement = document.getElementById('cartTotal');
        const cartCountElement = document.getElementById('cartCount');
        const paymentInfoSection = document.getElementById('paymentInfo');
        const finalAmountElement = document.getElementById('finalAmount');
        
        // Clear cart items
        cartItemsContainer.innerHTML = '';
        
        if (cartItems.length === 0) {
            emptyCartMessage.classList.remove('d-none');
            cartTotalElement.textContent = '₦0.00';
            cartCountElement.classList.add('d-none');
            paymentInfoSection.classList.add('d-none');
            return;
        }
        
        emptyCartMessage.classList.add('d-none');
        
        // Calculate total
        let cartTotal = 0;
        
        // Add each item to cart UI
        cartItems.forEach(item => {
            cartTotal += item.total;
            
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'card mb-2 cart-item';
            cartItemElement.innerHTML = `
                <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-0">${item.name} (${item.size})</h6>
                            <small class="text-muted">₦${item.price.toFixed(2)} x ${item.quantity}</small>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="me-2 fw-bold">₦${item.total.toFixed(2)}</span>
                            <button type="button" class="btn btn-sm btn-outline-danger remove-from-cart" data-id="${item.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            cartItemsContainer.appendChild(cartItemElement);
        });
        
        // Update total
        cartTotalElement.textContent = `₦${cartTotal.toFixed(2)}`;
        finalAmountElement.textContent = `₦${cartTotal.toFixed(2)}`;
        
        // Update cart count
        cartCountElement.textContent = cartItems.length;
        cartCountElement.classList.remove('d-none');
        
        // Show payment section
        paymentInfoSection.classList.remove('d-none');
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = parseInt(this.getAttribute('data-id'));
                removeFromCart(itemId);
            });
        });
    }
    
    // Remove item from cart
    function removeFromCart(itemId) {
        cartItems = cartItems.filter(item => item.id !== itemId);
        updateCartUI();
        showToast('Item removed from cart', 'info');
    }
    
    // Clear cart
    function clearCart() {
        if (cartItems.length === 0) return;
        
        if (confirm('Are you sure you want to clear your cart?')) {
            cartItems = [];
            updateCartUI();
            showToast('Cart cleared', 'info');
        }
    }
    
    // Generate random voucher
    function generateVoucher(orderTotal) {
        const voucherAmounts = [500, 200, 100, 50];
        const randomAmount = voucherAmounts[Math.floor(Math.random() * voucherAmounts.length)];
        
        // Create voucher code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let voucherCode = 'MANAI-';
        
        for (let i = 0; i < 6; i++) {
            voucherCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return {
            code: voucherCode,
            amount: randomAmount,
            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        };
    }
    
    // Handle form submission
    document.getElementById('orderForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate form
        if (cartItems.length === 0) {
            showToast('Please add items to your cart first', 'warning');
            return;
        }
        
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const customerAddress = document.getElementById('customerAddress').value;
        const paymentProof = document.getElementById('paymentProof').files[0];
        
        if (!paymentProof) {
            showToast('Please upload payment proof', 'danger');
            return;
        }
        
        // Validate file size (max 2MB to avoid Firestore document size limits)
        if (paymentProof.size > 2 * 1024 * 1024) {
            showToast('Please upload a file smaller than 2MB', 'danger');
            return;
        }
        
        // Validate file type (images only)
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(paymentProof.type)) {
            showToast('Please upload a valid image file (JPEG, PNG, GIF, WebP)', 'danger');
            return;
        }
        
        // Disable submit button to prevent multiple submissions
        const submitButton = document.getElementById('submitOrder');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        
        try {
            // Convert image to Base64
            const base64Image = await convertImageToBase64(paymentProof);
            
            // Calculate order total
            const orderTotal = cartItems.reduce((total, item) => total + item.total, 0);
            
            // Generate voucher
            const voucher = generateVoucher(orderTotal);
            
            // Create order object with Base64 image
            const order = {
                customerName,
                customerPhone,
                customerAddress,
                items: cartItems,
                total: orderTotal,
                paymentProofBase64: base64Image,
                paymentProofFilename: paymentProof.name,
                status: 'pending',
                orderDate: new Date(),
                estimatedDelivery: 45, // Default delivery time
                completed: false,
                reviewProvided: false,
                voucher: voucher
            };
            
            // Save order to Firestore
            const docRef = await db.collection('orders').add(order);
            
            // Show success message
            document.getElementById('orderId').textContent = docRef.id;
            document.getElementById('deliveryTime').textContent = order.estimatedDelivery;
            document.getElementById('voucherCode').textContent = `${voucher.code} - ₦${voucher.amount} OFF`;
            document.getElementById('orderConfirmation').classList.remove('d-none');
            
            // Hide form
            document.getElementById('orderForm').classList.add('d-none');
            
            // Update progress steps
            updateProgressSteps(2);
            
            // Show success toast
            showToast('Order placed successfully!', 'success');
            
        } catch (error) {
            console.error('Error processing order:', error);
            
            // Check if it's a Firebase error
            if (error.code === 'permission-denied') {
                showToast('Database permission error. Please contact support.', 'danger');
            } else if (error.code === 'unavailable') {
                showToast('Network error. Please check your connection and try again.', 'danger');
            } else {
                showToast('Failed to place order. Please try again.', 'danger');
            }
            
            // Re-enable submit button
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Place Order';
        }
    });
    
    // Convert image to Base64
    function convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    
    // Update progress steps
    function updateProgressSteps(activeStep) {
        document.querySelectorAll('.order-step').forEach((step, index) => {
            step.classList.remove('step-active', 'step-completed');
            
            if (index < activeStep) {
                step.classList.add('step-completed');
            } else if (index === activeStep) {
                step.classList.add('step-active');
            }
        });
    }
    
    // Image preview functionality
    document.getElementById('paymentProof').addEventListener('change', function(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('uploadPreview');
        const previewImage = document.getElementById('previewImage');
        
        if (file) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                preview.classList.remove('d-none');
            }
            
            reader.readAsDataURL(file);
        } else {
            preview.classList.add('d-none');
        }
    });
    
    // Remove image functionality
    document.getElementById('removeImage').addEventListener('click', function() {
        document.getElementById('paymentProof').value = '';
        document.getElementById('uploadPreview').classList.add('d-none');
    });
    
    // Copy Order ID functionality
    document.getElementById('copyOrderIdBtn').addEventListener('click', function() {
        const orderId = document.getElementById('orderId').textContent;
        navigator.clipboard.writeText(orderId).then(() => {
            showToast('Order ID copied to clipboard', 'success');
        });
    });
    
    // Event listeners
    document.getElementById('addToCartBtn').addEventListener('click', addToCart);
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    
    // Initialize page
    loadMenuItems();
    updateProgressSteps(0);
    updateCartUI();
});