// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let selectedMenu = null;
    let selectedSize = '';
    let currentPrice = 0;
    let cartItems = [];
    const DELIVERY_FEE = 300; // ₦300 delivery fee
    
    // Firebase references
    const db = firebase.firestore();
    
    // Check if a specific menu item was requested via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const requestedItem = urlParams.get('item');
    const requestedItemSize = urlParams.get('size');
    
    // DOM Elements
    let cartSidebar, cartOverlay, closeCartBtn, viewCartBtn, cartButton, checkoutBtn;
    let cartItemsContainer, emptyCartMessage, cartSubtotalElement, deliveryFeeElement;
    let cartTotalElement, mainCartTotalElement, cartCountElement, paymentInfoSection;
    let finalAmountElement;

    // Initialize all DOM elements
    function initializeAllDOMElements() {
        // Main page elements
        cartButton = document.getElementById('cartButton');
        viewCartBtn = document.getElementById('viewCartBtn');
        paymentInfoSection = document.getElementById('paymentInfo');
        finalAmountElement = document.getElementById('finalAmount');
        mainCartTotalElement = document.getElementById('mainCartTotal');
        cartCountElement = document.getElementById('cartCount');
        
        // Sidebar elements
        cartSidebar = document.getElementById('cartSidebar');
        cartOverlay = document.getElementById('cartOverlay');
        closeCartBtn = document.getElementById('closeCart');
        checkoutBtn = document.getElementById('checkoutBtn');
        cartItemsContainer = document.getElementById('cartItemsContainer');
        emptyCartMessage = document.getElementById('emptyCartMessage');
        cartSubtotalElement = document.getElementById('cartSubtotal');
        deliveryFeeElement = document.getElementById('deliveryFee');
        cartTotalElement = document.getElementById('cartTotal');
        
        console.log('Cart elements initialized:', {
            cartItemsContainer: !!cartItemsContainer,
            emptyCartMessage: !!emptyCartMessage,
            cartSidebar: !!cartSidebar
        });
        
        // Add event listeners
        setupEventListeners();
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Cart functionality
        if (cartButton) {
            cartButton.addEventListener('click', function(e) {
                e.preventDefault();
                openCart();
            });
        }
        
        if (viewCartBtn) {
            viewCartBtn.addEventListener('click', openCart);
        }
        
        if (closeCartBtn) {
            closeCartBtn.addEventListener('click', closeCart);
        }
        
        if (cartOverlay) {
            cartOverlay.addEventListener('click', closeCart);
        }
        
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', function() {
                closeCart();
                if (paymentInfoSection) {
                    paymentInfoSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
        
        // Add to cart button
        const addToCartBtn = document.getElementById('addToCartBtn');
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', addToCart);
        }
        
        // Form submission
        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', handleOrderSubmission);
        }
        
        // Copy Order ID
        const copyOrderIdBtn = document.getElementById('copyOrderIdBtn');
        if (copyOrderIdBtn) {
            copyOrderIdBtn.addEventListener('click', copyOrderId);
        }
        
        // Image handling
        const paymentProofInput = document.getElementById('paymentProof');
        const removeImageBtn = document.getElementById('removeImage');
        
        if (paymentProofInput) {
            paymentProofInput.addEventListener('change', handleImagePreview);
        }
        
        if (removeImageBtn) {
            removeImageBtn.addEventListener('click', removeImage);
        }
        
        // Menu selection
        const menuSelectElement = document.getElementById('menuSelect');
        if (menuSelectElement) {
            menuSelectElement.addEventListener('change', handleMenuSelection);
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
    
    // Cart sidebar functionality
    function openCart() {
        if (cartSidebar) {
            cartSidebar.classList.add('open');
        }
        if (cartOverlay) {
            cartOverlay.classList.add('open');
        }
        document.body.style.overflow = 'hidden';
    }
    
    function closeCart() {
        if (cartSidebar) {
            cartSidebar.classList.remove('open');
        }
        if (cartOverlay) {
            cartOverlay.classList.remove('open');
        }
        document.body.style.overflow = 'auto';
    }
    
    // Load menu items from Firebase
    function loadMenuItems() {
        const menuSelect = document.getElementById('menuSelect');
        
        if (!menuSelect) {
            console.error('Menu select element not found');
            return;
        }
        
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
            if (menuSelect.options.length > 1) {
                menuSelect.remove(menuSelect.options.length - 1);
            }
            
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
                
                // If this is the requested item, select it
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
            if (menuSelect.options.length > 1) {
                menuSelect.remove(menuSelect.options.length - 1);
            }
            
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
    function handleMenuSelection(e) {
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
            const menuDetails = document.getElementById('menuDetails');
            if (menuDetails) {
                menuDetails.classList.add('d-none');
            }
        }
    }
    
    // Display menu details and size options - FIXED FOR MOBILE
    function displayMenuDetails(menuItem) {
        const menuDetails = document.getElementById('menuDetails');
        const selectedMenuName = document.getElementById('selectedMenuName');
        const selectedMenuDescription = document.getElementById('selectedMenuDescription');
        const sizeOptions = document.getElementById('sizeOptions');
        
        if (!menuDetails || !selectedMenuName || !selectedMenuDescription || !sizeOptions) {
            console.error('Menu details elements not found');
            return;
        }
        
        // Set menu name and description
        selectedMenuName.textContent = menuItem.name;
        selectedMenuDescription.textContent = menuItem.description;
        
        // Clear existing size options
        sizeOptions.innerHTML = '';
        
        // Add size options - improved for mobile
        Object.keys(menuItem.prices).forEach(size => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-outline-primary size-option mb-2';
            button.innerHTML = `
                <span class="d-none d-md-inline">${size.charAt(0).toUpperCase() + size.slice(1)}</span>
                <span class="d-md-none">${size.charAt(0).toUpperCase()}</span>
                <br>
                <small>₦${menuItem.prices[size]}</small>
            `;
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
        setTimeout(() => {
            const mediumButton = sizeOptions.querySelector('[data-size="medium"]');
            if (mediumButton) {
                mediumButton.click();
            } else if (sizeOptions.firstChild) {
                // Select the first available size
                sizeOptions.firstChild.click();
            }
        }, 100);
        
        // Show menu details
        menuDetails.classList.remove('d-none');
    }
    
    // Add to cart functionality
    function addToCart() {
        if (!selectedMenu || !selectedSize) {
            showToast('Please select a menu item and size', 'warning');
            return;
        }
        
        const quantityInput = document.getElementById('quantity');
        const quantity = parseInt(quantityInput ? quantityInput.value : 1) || 1;
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
        if (quantityInput) {
            quantityInput.value = 1;
        }
        
        // Open cart sidebar
        openCart();
    }
    
    // Update cart UI - FIXED VERSION
    function updateCartUI() {
        console.log('Updating cart UI, items:', cartItems.length);
        
        // Check if cart container elements exist
        if (!cartItemsContainer || !emptyCartMessage) {
            console.log('Cart container not found, attempting to reinitialize...');
            initializeAllDOMElements();
            
            // If still not found after reinitialization, wait a bit and try again
            if (!cartItemsContainer || !emptyCartMessage) {
                console.error('Cart container elements still not found after reinitialization');
                return;
            }
        }
        
        // Clear cart items
        cartItemsContainer.innerHTML = '';
        
        if (cartItems.length === 0) {
            emptyCartMessage.classList.remove('d-none');
            
            // Update other elements if they exist
            updateCartTotals(0, 0, 0);
            
            if (cartCountElement) {
                cartCountElement.classList.add('d-none');
            }
            if (paymentInfoSection) {
                paymentInfoSection.classList.add('d-none');
            }
            if (checkoutBtn) {
                checkoutBtn.disabled = true;
            }
            return;
        }
        
        emptyCartMessage.classList.add('d-none');
        
        // Calculate subtotal
        let cartSubtotal = 0;
        
        // Add each item to cart UI
        cartItems.forEach(item => {
            cartSubtotal += item.total;
            
            const cartItemElement = document.createElement('div');
            cartItemElement.className = 'card mb-3 cart-item';
            cartItemElement.innerHTML = `
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div class="flex-grow-1">
                            <h6 class="mb-0">${item.name}</h6>
                            <small class="text-muted">Size: ${item.size}</small>
                        </div>
                        <button type="button" class="btn btn-sm btn-outline-danger remove-from-cart ms-2" data-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="quantity-controls">
                            <button class="quantity-btn decrease-quantity" data-id="${item.id}">-</button>
                            <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-id="${item.id}">
                            <button class="quantity-btn increase-quantity" data-id="${item.id}">+</button>
                        </div>
                        <div class="text-end ms-3">
                            <div class="fw-bold">₦${item.total.toFixed(2)}</div>
                            <small class="text-muted">₦${item.price.toFixed(2)} each</small>
                        </div>
                    </div>
                </div>
            `;
            
            cartItemsContainer.appendChild(cartItemElement);
        });
        
        // Calculate delivery fee (free for orders over ₦5000)
        const deliveryFee = cartSubtotal > 5000 ? 0 : DELIVERY_FEE;
        const cartTotal = cartSubtotal + deliveryFee;
        
        // Update totals
        updateCartTotals(cartSubtotal, deliveryFee, cartTotal);
        
        // Update cart count
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCountElement) {
            cartCountElement.textContent = totalItems;
            cartCountElement.classList.remove('d-none');
        }
        
        // Show payment section if we have items
        if (paymentInfoSection) {
            paymentInfoSection.classList.remove('d-none');
        }
        
        // Enable checkout button
        if (checkoutBtn) {
            checkoutBtn.disabled = false;
        }
        
        // Add event listeners to cart items
        addCartItemEventListeners();
    }
    
    // Update cart totals
    function updateCartTotals(subtotal, deliveryFee, total) {
        if (cartSubtotalElement) cartSubtotalElement.textContent = `₦${subtotal.toFixed(2)}`;
        if (deliveryFeeElement) deliveryFeeElement.textContent = `₦${deliveryFee.toFixed(2)}`;
        if (cartTotalElement) cartTotalElement.textContent = `₦${total.toFixed(2)}`;
        if (mainCartTotalElement) mainCartTotalElement.textContent = `₦${total.toFixed(2)}`;
        if (finalAmountElement) finalAmountElement.textContent = `₦${total.toFixed(2)}`;
    }
    
    // Add event listeners to cart items
    function addCartItemEventListeners() {
        // Remove item buttons
        document.querySelectorAll('.remove-from-cart').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = parseInt(this.getAttribute('data-id'));
                removeFromCart(itemId);
            });
        });
        
        // Decrease quantity buttons
        document.querySelectorAll('.decrease-quantity').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = parseInt(this.getAttribute('data-id'));
                updateItemQuantity(itemId, -1);
            });
        });
        
        // Increase quantity buttons
        document.querySelectorAll('.increase-quantity').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = parseInt(this.getAttribute('data-id'));
                updateItemQuantity(itemId, 1);
            });
        });
        
        // Quantity input changes
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', function() {
                const itemId = parseInt(this.getAttribute('data-id'));
                const newQuantity = parseInt(this.value) || 1;
                setItemQuantity(itemId, newQuantity);
            });
        });
    }
    
    // Remove item from cart
    function removeFromCart(itemId) {
        cartItems = cartItems.filter(item => item.id !== itemId);
        updateCartUI();
        showToast('Item removed from cart', 'info');
    }
    
    // Update item quantity
    function updateItemQuantity(itemId, change) {
        const itemIndex = cartItems.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            cartItems[itemIndex].quantity += change;
            
            // Ensure quantity is at least 1
            if (cartItems[itemIndex].quantity < 1) {
                cartItems[itemIndex].quantity = 1;
            }
            
            // Update total
            cartItems[itemIndex].total = cartItems[itemIndex].price * cartItems[itemIndex].quantity;
            
            updateCartUI();
        }
    }
    
    // Set specific item quantity
    function setItemQuantity(itemId, quantity) {
        const itemIndex = cartItems.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            // Ensure quantity is at least 1
            cartItems[itemIndex].quantity = Math.max(1, quantity);
            
            // Update total
            cartItems[itemIndex].total = cartItems[itemIndex].price * cartItems[itemIndex].quantity;
            
            updateCartUI();
        }
    }
    
    // Handle order submission
    async function handleOrderSubmission(e) {
        e.preventDefault();
        
        // Validate form
        if (cartItems.length === 0) {
            showToast('Please add items to your cart first', 'warning');
            return;
        }
        
        const customerName = document.getElementById('customerName');
        const customerPhone = document.getElementById('customerPhone');
        const customerAddress = document.getElementById('customerAddress');
        const paymentProof = document.getElementById('paymentProof');
        
        if (!customerName || !customerPhone || !customerAddress || !paymentProof) {
            showToast('Please fill in all required fields', 'danger');
            return;
        }
        
        if (!paymentProof.files[0]) {
            showToast('Please upload payment proof', 'danger');
            return;
        }
        
        const file = paymentProof.files[0];
        
        // Validate file size (max 2MB to avoid Firestore document size limits)
        if (file.size > 2 * 1024 * 1024) {
            showToast('Please upload a file smaller than 2MB', 'danger');
            return;
        }
        
        // Validate file type (images only)
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
            showToast('Please upload a valid image file (JPEG, PNG, GIF, WebP)', 'danger');
            return;
        }
        
        // Disable submit button to prevent multiple submissions
        const submitButton = document.getElementById('submitOrder');
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<div class="loading-spinner"></div> Processing...';
        }
        
        try {
            // Convert image to Base64
            const base64Image = await convertImageToBase64(file);
            
            // Calculate order total
            const orderSubtotal = cartItems.reduce((total, item) => total + item.total, 0);
            const deliveryFee = orderSubtotal > 5000 ? 0 : DELIVERY_FEE;
            const orderTotal = orderSubtotal + deliveryFee;
            
            // Generate voucher
            const voucher = generateVoucher(orderTotal);
            
            // Create order object with Base64 image
            const order = {
                customerName: customerName.value,
                customerPhone: customerPhone.value,
                customerAddress: customerAddress.value,
                items: cartItems,
                subtotal: orderSubtotal,
                deliveryFee: deliveryFee,
                total: orderTotal,
                paymentProofBase64: base64Image,
                paymentProofFilename: file.name,
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
            const orderIdElement = document.getElementById('orderId');
            const deliveryTimeElement = document.getElementById('deliveryTime');
            const voucherCodeElement = document.getElementById('voucherCode');
            const orderConfirmation = document.getElementById('orderConfirmation');
            const orderFormElement = document.getElementById('orderForm');
            
            if (orderIdElement) orderIdElement.textContent = docRef.id;
            if (deliveryTimeElement) deliveryTimeElement.textContent = order.estimatedDelivery;
            if (voucherCodeElement) voucherCodeElement.textContent = `${voucher.code} - ₦${voucher.amount} OFF`;
            if (orderConfirmation) orderConfirmation.classList.remove('d-none');
            if (orderFormElement) orderFormElement.classList.add('d-none');
            
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
            const submitButton = document.getElementById('submitOrder');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Place Order';
            }
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
    
    // Copy Order ID functionality
    function copyOrderId() {
        const orderId = document.getElementById('orderId');
        if (orderId && orderId.textContent) {
            navigator.clipboard.writeText(orderId.textContent).then(() => {
                showToast('Order ID copied to clipboard', 'success');
            }).catch(err => {
                console.error('Failed to copy: ', err);
                showToast('Failed to copy Order ID', 'danger');
            });
        }
    }
    
    // Handle image preview
    function handleImagePreview(e) {
        const file = e.target.files[0];
        const preview = document.getElementById('uploadPreview');
        const previewImage = document.getElementById('previewImage');
        
        if (file && preview && previewImage) {
            const reader = new FileReader();
            
            reader.onload = function(e) {
                previewImage.src = e.target.result;
                preview.classList.remove('d-none');
            };
            
            reader.readAsDataURL(file);
        } else if (preview) {
            preview.classList.add('d-none');
        }
    }
    
    // Remove image
    function removeImage() {
        const paymentProof = document.getElementById('paymentProof');
        const preview = document.getElementById('uploadPreview');
        
        if (paymentProof) paymentProof.value = '';
        if (preview) preview.classList.add('d-none');
    }
    
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
        const steps = document.querySelectorAll('.order-step');
        if (steps.length === 0) return;
        
        steps.forEach((step, index) => {
            step.classList.remove('step-active', 'step-completed');
            
            if (index < activeStep) {
                step.classList.add('step-completed');
            } else if (index === activeStep) {
                step.classList.add('step-active');
            }
        });
    }
    
    // Initialize everything
    function initializeApp() {
        initializeAllDOMElements();
        loadMenuItems();
        updateProgressSteps(0);
        updateCartUI();
    }
    
    // Start the app
    initializeApp();
});