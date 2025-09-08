// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Firebase
    const db = firebase.firestore();
    
    // Load featured menu items on homepage
    function loadFeaturedMenuItems() {
        const featuredContainer = document.getElementById('featuredMenuItems');
        
        if (!featuredContainer) return;
        
        // Get 3 random menu items to feature
        db.collection('menu').get().then((querySnapshot) => {
            const menuItems = [];
            querySnapshot.forEach((doc) => {
                menuItems.push({ id: doc.id, ...doc.data() });
            });
            
            // Shuffle and take 3 items
            const shuffled = menuItems.sort(() => 0.5 - Math.random());
            const featured = shuffled.slice(0, 3);
            
            // Display featured items
            featuredContainer.innerHTML = '';
            featured.forEach(item => {
                const col = document.createElement('div');
                col.className = 'col-md-4 mb-4';
                
                col.innerHTML = `
                    <div class="card menu-card h-100">
                        <div class="position-relative">
                            <img src="${item.image}" class="card-img-top" alt="${item.name}">
                            <div class="price-tag">₦${item.prices.medium}</div>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${item.name}</h5>
                            <p class="card-text">${item.description.substring(0, 80)}...</p>
                            <div class="d-flex justify-content-between align-items-center">
                                <a href="menu.html" class="btn btn-sm btn-outline-primary">View Details</a>
                                <small class="text-muted">${item.preparationTime} mins</small>
                            </div>
                        </div>
                    </div>
                `;
                
                featuredContainer.appendChild(col);
            });
        }).catch((error) => {
            console.error("Error loading featured menu items: ", error);
            featuredContainer.innerHTML = `
                <div class="col-12 text-center">
                    <p class="text-muted">Failed to load featured items. Please check your connection.</p>
                </div>
            `;
        });
    }
    
    // Initialize functions
    loadFeaturedMenuItems();
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
});