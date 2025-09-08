// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize variables
    let selectedMenu = null;
    let selectedSize = '';
    let currentPrice = 0;
    
    // Firebase references
    const db = firebase.firestore();
    const storage = firebase.storage();
    
    // Check if a specific menu item was requested via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const requestedItem = urlParams.get('item');
    
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
                
                // If this is the requested item, select it
                if (requestedItem && doc.id === requestedItem) {
                    menuSelect.value = doc.id;
                    triggerEvent(menuSelect, 'change');
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
            document.getElementById('paymentInfo').classList.add('d-none');
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
                
                // Calculate and update price
                calculateTotalPrice();
                
                // Show payment info
                document.getElementById('paymentInfo').classList.remove('d-none');
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
    
    // Calculate total price based on quantity
    function calculateTotalPrice() {
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const totalPrice = currentPrice * quantity;
        
        document.getElementById('calculatedPrice').textContent = `₦${totalPrice.toFixed(2)}`;
        document.getElementById('finalAmount').textContent = `₦${totalPrice.toFixed(2)}`;
    }
    
    // Handle quantity change
    document.getElementById('quantity').addEventListener('input', calculateTotalPrice);
    
    // Handle form submission
    document.getElementById('orderForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate form
        if (!selectedMenu || !selectedSize) {
            showToast('Please select a menu item and size', 'danger');
            return;
        }
        
        const customerName = document.getElementById('customerName').value;
        const customerPhone = document.getElementById('customerPhone').value;
        const customerAddress = document.getElementById('customerAddress').value;
        const quantity = parseInt(document.getElementById('quantity').value);
        const paymentProof = document.getElementById('paymentProof').files[0];
        
        if (!paymentProof) {
            showToast('Please upload payment proof', 'danger');
            return;
        }
        
        // Validate file size (max 5MB)
        if (paymentProof.size > 5 * 1024 * 1024) {
            showToast('Please upload a file smaller than 5MB', 'danger');
            return;
        }
        
        // Disable submit button to prevent multiple submissions
        const submitButton = document.getElementById('submitOrder');
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
        
        // Upload payment proof to Firebase Storage
        const storageRef = storage.ref(`payment-proofs/${Date.now()}_${paymentProof.name}`);
        const uploadTask = storageRef.put(paymentProof);
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                // Progress monitoring (optional)
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log('Upload is ' + progress + '% done');
            }, 
            (error) => {
                // Handle unsuccessful uploads
                console.error('Upload failed:', error);
                showToast('Failed to upload payment proof. Please try again.', 'danger');
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Place Order';
            }, 
            () => {
                // Handle successful upload
                uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                    // Create order object
                    const order = {
                        customerName,
                        customerPhone,
                        customerAddress,
                        menuItem: selectedMenu.id,
                        menuItemName: selectedMenu.name,
                        size: selectedSize,
                        quantity,
                        unitPrice: currentPrice,
                        totalPrice: currentPrice * quantity,
                        paymentProofURL: downloadURL,
                        status: 'pending',
                        orderDate: new Date(),
                        estimatedDelivery: parseInt(selectedMenu.preparationTime) + 30, // Add delivery time
                        completed: false,
                        reviewProvided: false
                    };
                    
                    // Save order to Firestore
                    db.collection('orders').add(order)
                        .then((docRef) => {
                            // Show success message
                            document.getElementById('orderId').textContent = docRef.id;
                            document.getElementById('deliveryTime').textContent = order.estimatedDelivery;
                            document.getElementById('orderConfirmation').classList.remove('d-none');
                            
                            // Hide form
                            document.getElementById('orderForm').classList.add('d-none');
                            
                            // Reset form
                            document.getElementById('orderForm').reset();
                            
                            // Show success toast
                            showToast('Order placed successfully!', 'success');
                        })
                        .catch((error) => {
                            console.error('Error saving order: ', error);
                            showToast('Failed to place order. Please try again.', 'danger');
                            submitButton.disabled = false;
                            submitButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Place Order';
                        });
                });
            }
        );
    });
    
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
    
    // Initialize page
    loadMenuItems();
});