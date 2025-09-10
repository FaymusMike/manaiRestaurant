// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const db = firebase.firestore();
    
    // Load menu items
    function loadMenuItems() {
        const menuContainer = document.getElementById('menuItemsContainer');
        
        // Show loading state
        menuContainer.innerHTML = `
            <div class="col-12 text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-3">Loading menu items...</p>
            </div>
        `;
        
        db.collection('menu').orderBy('name').get().then((querySnapshot) => {
            menuContainer.innerHTML = '';
            
            if (querySnapshot.empty) {
                menuContainer.innerHTML = `
                    <div class="col-12 text-center">
                        <p class="text-muted">No menu items found.</p>
                    </div>
                `;
                return;
            }
            
            let itemsLoaded = 0;
            const totalItems = querySnapshot.size;
            
            querySnapshot.forEach((doc) => {
                const item = { id: doc.id, ...doc.data() };
                const col = document.createElement('div');
                col.className = `col-md-6 col-lg-4 mb-4 menu-item ${item.category}`;
                
                col.innerHTML = `
                    <div class="card menu-card h-100">
                        <div class="position-relative">
                            <img src="${item.image}" class="card-img-top" alt="${item.name}" style="height: 200px; object-fit: cover;">
                            <div class="price-tag">₦${item.prices.medium}</div>
                            <span class="position-absolute top-0 start-0 badge bg-primary m-2">${item.category}</span>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text">${item.description.substring(0, 100)}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <button class="btn btn-sm btn-outline-primary view-details" data-id="${doc.id}">View Details</button>
                                <small class="text-muted">${item.preparationTime} mins</small>
                            </div>
                        </div>
                    </div>
                `;
                
                menuContainer.appendChild(col);
                itemsLoaded++;
                
                // If all items are loaded, initialize the filtering and event listeners
                if (itemsLoaded === totalItems) {
                    initializeMenuInteractions();
                }
            });
            
        }).catch((error) => {
            console.error("Error loading menu items: ", error);
            menuContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">Failed to load menu items. Please check your connection.</p>
                    <button class="btn btn-primary mt-2" onclick="loadMenuItems()">Try Again</button>
                </div>
            `;
        });
    }
    
    // Initialize menu interactions after items are loaded
    function initializeMenuInteractions() {
        // Add event listeners to view details buttons
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                showItemDetails(itemId);
            });
        });
        
        // Setup filtering
        setupFiltering();
    }
    
    // Show item details in modal    
    function showItemDetails(itemId) {
        db.collection('menu').doc(itemId).get().then((doc) => {
            if (doc.exists) {
                const item = doc.data();
                const modalElement = document.getElementById('menuItemModal');
                const modal = new bootstrap.Modal(modalElement);
                
                // Show loading state in modal
                document.getElementById('modalItemName').textContent = 'Loading...';
                document.getElementById('modalItemImage').src = '';
                document.getElementById('modalItemDescription').textContent = 'Please wait while we load the item details.';
                document.getElementById('modalItemTime').textContent = '';
                document.getElementById('modalItemPrices').innerHTML = '<li class="text-muted">Loading prices...</li>';
                
                modal.show();

                // Populate modal with actual data
                document.getElementById('modalItemName').textContent = item.name;
                document.getElementById('modalItemImage').src = item.image;
                document.getElementById('modalItemDescription').textContent = item.description;
                document.getElementById('modalItemTime').textContent = `${item.preparationTime} minutes`;
                
                const pricesList = document.getElementById('modalItemPrices');
                pricesList.innerHTML = '';
                
                for (const size in item.prices) {
                    const li = document.createElement('li');
                    li.className = 'mb-1';
                    li.innerHTML = `<strong>${size.charAt(0).toUpperCase() + size.slice(1)}:</strong> ₦${item.prices[size]}`;
                    pricesList.appendChild(li);
                }
                
                // Update order button to include item ID and default size
                const orderButton = modalElement.querySelector('.btn-primary');
                if (orderButton) {
                    orderButton.href = `order.html?item=${itemId}&size=medium`;
                    orderButton.innerHTML = '<i class="fas fa-shopping-cart me-1"></i> Add to Order';
                }
                
            }
        }).catch((error) => {
            console.error("Error getting menu item: ", error);
            document.getElementById('modalItemName').textContent = 'Error';
            document.getElementById('modalItemDescription').textContent = 'Failed to load item details. Please try again.';
        });
    }
    
    // Filter menu items - FIXED THE visibleItems BUG
    function setupFiltering() {
        // Handle desktop filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Update active button
                filterButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                const filter = this.getAttribute('data-filter');
                
                // Show/hide items based on filter
                const menuItems = document.querySelectorAll('.menu-item');
                let visibleItems = 0; // FIXED: Added missing variable declaration
                
                menuItems.forEach(item => {
                    if (filter === 'all' || item.classList.contains(filter)) {
                        item.style.display = 'block';
                        visibleItems++;
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                // Show message if no items match the filter
                const menuContainer = document.getElementById('menuItemsContainer');
                if (visibleItems === 0) {
                    // Remove any existing messages first
                    const existingMessage = menuContainer.querySelector('.alert');
                    if (existingMessage) {
                        existingMessage.remove();
                    }
                    
                    const noItemsMessage = document.createElement('div');
                    noItemsMessage.className = 'col-12 text-center mt-4';
                    noItemsMessage.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No menu items found in this category.
                        </div>
                    `;
                    menuContainer.appendChild(noItemsMessage);
                } else {
                    // Remove any existing messages
                    const existingMessage = menuContainer.querySelector('.alert');
                    if (existingMessage) {
                        existingMessage.remove();
                    }
                }
            });
        });
        
        // Close dropdown after selection on mobile
        document.querySelectorAll('.dropdown-item.filter-btn').forEach(item => {
            item.addEventListener('click', function() {
                const dropdown = document.getElementById('filterDropdown');
                const dropdownInstance = bootstrap.Dropdown.getInstance(dropdown);
                if (dropdownInstance) {
                    dropdownInstance.hide();
                }
            });
        });
    }
                
    // Search functionality
    function setupSearch() {
        const searchInput = document.getElementById('menuSearch');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase();
                const menuItems = document.querySelectorAll('.menu-item');
                let visibleItems = 0;
                
                menuItems.forEach(item => {
                    const itemName = item.querySelector('.card-title').textContent.toLowerCase();
                    const itemDescription = item.querySelector('.card-text').textContent.toLowerCase();
                    
                    if (itemName.includes(searchTerm) || itemDescription.includes(searchTerm)) {
                        item.style.display = 'block';
                        visibleItems++;
                    } else {
                        item.style.display = 'none';
                    }
                });
                
                // Update filter button to show "all"
                const allFilterButton = document.querySelector('[data-filter="all"]');
                if (allFilterButton) {
                    allFilterButton.classList.add('active');
                }
                document.querySelectorAll('.filter-btn:not([data-filter="all"])').forEach(btn => {
                    btn.classList.remove('active');
                });
                
                // Show message if no items found
                const menuContainer = document.getElementById('menuItemsContainer');
                if (visibleItems === 0 && searchTerm.length > 0) {
                    // Remove any existing messages first
                    const existingMessage = menuContainer.querySelector('.alert');
                    if (existingMessage) {
                        existingMessage.remove();
                    }
                    
                    const noItemsMessage = document.createElement('div');
                    noItemsMessage.className = 'col-12 text-center mt-4';
                    noItemsMessage.innerHTML = `
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            No menu items found matching "${searchTerm}".
                        </div>
                    `;
                    menuContainer.appendChild(noItemsMessage);
                } else {
                    // Remove any existing messages
                    const existingMessage = menuContainer.querySelector('.alert');
                    if (existingMessage) {
                        existingMessage.remove();
                    }
                }
            });
        }
    }
    
    // Initialize functions
    loadMenuItems();
    setupSearch();
});

// Make loadMenuItems available globally for retry
window.loadMenuItems = function() {
    const menuContainer = document.getElementById('menuItemsContainer');
    menuContainer.innerHTML = `
        <div class="col-12 text-center">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-3">Loading menu items...</p>
        </div>
    `;
    
    const db = firebase.firestore();
    db.collection('menu').orderBy('name').get().then((querySnapshot) => {
        menuContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            menuContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">No menu items found.</p>
                </div>
            `;
            return;
        }
        
        querySnapshot.forEach((doc) => {
            const item = doc.data();
            const col = document.createElement('div');
            col.className = `col-md-6 col-lg-4 mb-4 menu-item ${item.category}`;
            
            col.innerHTML = `
                <div class="card menu-card h-100">
                    <div class="position-relative">
                        <img src="${item.image}" class="card-img-top" alt="${item.name}" style="height: 200px; object-fit: cover;">
                        <div class="price-tag">₦${item.prices.medium}</div>
                        <span class="position-absolute top-0 start-0 badge bg-primary m-2">${item.category}</span>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${item.name}</h5>
                        <p class="card-text">${item.description.substring(0, 100)}...</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <button class="btn btn-sm btn-outline-primary view-details" data-id="${doc.id}">View Details</button>
                            <small class="text-muted">${item.preparationTime} mins</small>
                        </div>
                    </div>
                </div>
            `;
            
            menuContainer.appendChild(col);
        });
        
        // Reinitialize event listeners
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', function() {
                const itemId = this.getAttribute('data-id');
                const db = firebase.firestore();
                
                db.collection('menu').doc(itemId).get().then((doc) => {
                    if (doc.exists) {
                        const item = doc.data();
                        const modal = new bootstrap.Modal(document.getElementById('menuItemModal'));
                        
                        document.getElementById('modalItemName').textContent = item.name;
                        document.getElementById('modalItemImage').src = item.image;
                        document.getElementById('modalItemDescription').textContent = item.description;
                        document.getElementById('modalItemTime').textContent = `${item.preparationTime} minutes`;
                        
                        const pricesList = document.getElementById('modalItemPrices');
                        pricesList.innerHTML = '';
                        
                        for (const size in item.prices) {
                            const li = document.createElement('li');
                            li.innerHTML = `<strong>${size.charAt(0).toUpperCase() + size.slice(1)}:</strong> ₦${item.prices[size]}`;
                            pricesList.appendChild(li);
                        }
                        
                        modal.show();
                    }
                });
            });
        });
        
    }).catch((error) => {
        console.error("Error loading menu items: ", error);
        menuContainer.innerHTML = `
            <div class="col-12 text-center">
                <p class="text-muted">Failed to load menu items. Please check your connection.</p>
                <button class="btn btn-primary mt-2" onclick="loadMenuItems()">Try Again</button>
            </div>
        `;
    });
};