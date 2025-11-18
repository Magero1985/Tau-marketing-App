// app.js - Tau Marketplace - FIXED VERSION
console.log('📱 Loading Tau Marketplace app.js...');

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, orderBy, addDoc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAaUOObFv8KU6KSYC7Uj9c2ELPjbdu-JX0",
    authDomain: "tau-marketplace.firebaseapp.com",
    projectId: "tau-marketplace",
    storageBucket: "tau-marketplace.firebasestorage.app",
    messagingSenderId: "692166197354",
    appId: "1:692166197354:web:b002dd1283f4b247a68a13"
};

// Initialize Firebase
console.log('🔥 Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Make globally available IMMEDIATELY
window.firebaseServices = { auth, db, storage };
window.currentUser = null;

// Dispatch event to notify that Firebase is ready
window.dispatchEvent(new Event('firebaseInitialized'));
console.log('✅ Firebase initialized successfully');

// ============================================
// PWA INSTALLATION
// ============================================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.classList.add('show');
    }
});

window.installPWA = async () => {
    if (!deferredPrompt) {
        alert('App installation not available on this device');
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('Install prompt:', outcome);
    
    deferredPrompt = null;
    const installPrompt = document.getElementById('installPrompt');
    if (installPrompt) {
        installPrompt.classList.remove('show');
    }
};

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registered');
            })
            .catch((error) => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function generateUserCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TAU-${timestamp}-${randomStr}`;
}

function showLoginView() {
    const loginView = document.getElementById('loginView');
    const accountDashboard = document.getElementById('accountDashboard');
    
    if (loginView) loginView.style.display = 'block';
    if (accountDashboard) accountDashboard.style.display = 'none';
}

function showVerificationReminder() {
    console.log('Email not verified');
}

// ============================================
// AUTHENTICATION
// ============================================
onAuthStateChanged(auth, async (user) => {
    console.log('🔐 Auth state changed:', user ? 'Logged in' : 'Logged out');
    
    if (user) {
        window.currentUser = user;
        console.log('✅ User authenticated:', user.email);
        await loadUserData();
        
        if (!user.emailVerified) {
            showVerificationReminder();
        }
    } else {
        window.currentUser = null;
        showLoginView();
    }
});

// ============================================
// LOAD USER DATA
// ============================================
async function loadUserData() {
    if (!window.currentUser) return;
    
    const loginView = document.getElementById('loginView');
    const accountDashboard = document.getElementById('accountDashboard');
    
    if (loginView) loginView.style.display = 'none';
    if (accountDashboard) accountDashboard.style.display = 'block';
    
    const memberEmail = document.getElementById('memberEmail');
    if (memberEmail) memberEmail.textContent = window.currentUser.email;
    
    try {
        const userDocRef = doc(db, 'users', window.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            const memberName = document.getElementById('memberName');
            const userCode = document.getElementById('userCode');
            const pointsDisplay = document.getElementById('pointsDisplay');
            const salesDisplay = document.getElementById('salesDisplay');
            const referralsDisplay = document.getElementById('referralsDisplay');
            const productsDisplay = document.getElementById('productsDisplay');
            
            if (memberName) memberName.textContent = userData.fullName || 'Not set';
            if (userCode) userCode.textContent = userData.userCode || 'N/A';
            if (pointsDisplay) pointsDisplay.textContent = userData.points || 0;
            if (salesDisplay) salesDisplay.textContent = userData.sales || 0;
            if (referralsDisplay) referralsDisplay.textContent = userData.referrals || 0;
            if (productsDisplay) productsDisplay.textContent = userData.products || 0;
            
            const statusBadge = document.getElementById('verificationStatus');
            if (statusBadge) {
                if (userData.verified && window.currentUser.emailVerified) {
                    statusBadge.textContent = '✓ Verified';
                    statusBadge.className = 'verification-badge';
                } else {
                    statusBadge.textContent = 'Pending';
                    statusBadge.className = 'verification-badge pending';
                }
            }
            
            const transferBtn = document.getElementById('transferBtn');
            if (transferBtn && (userData.points || 0) >= 1000) {
                transferBtn.disabled = false;
            }
            
            const profilePhoto = document.getElementById('profilePhoto');
            if (profilePhoto && userData.photoURL) {
                profilePhoto.innerHTML = `<img src="${userData.photoURL}" alt="Profile">`;
            }
            
            await updateDoc(userDocRef, {
                lastLogin: serverTimestamp(),
                emailVerified: window.currentUser.emailVerified
            });
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

window.loadUserData = loadUserData;

// ============================================
// LOAD MARKETPLACE
// ============================================
async function loadMarketplace() {
    const grid = document.getElementById('marketplaceGrid');
    
    if (!grid) return;
    
    grid.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        console.log('📦 Loading marketplace products...');
        
        const q = query(
            collection(db, 'products'),
            where('verificationStatus', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        console.log(`Found ${querySnapshot.size} approved products`);
        
        if (querySnapshot.empty) {
            console.log('No approved products, loading samples...');
            grid.innerHTML = createSampleProducts();
            return;
        }
        
        let productsHTML = '';
        
        for (const docSnap of querySnapshot.docs) {
            const product = docSnap.data();
            const productId = docSnap.id;
            
            let sellerName = 'Anonymous';
            try {
                const sellerDoc = await getDoc(doc(db, 'users', product.userId));
                if (sellerDoc.exists()) {
                    sellerName = sellerDoc.data().fullName || 'Anonymous';
                }
            } catch (err) {
                console.warn('Could not fetch seller info');
            }
            
            const categoryEmoji = {
                'physical': '📦',
                'service': '💼',
                'app': '📱',
                'website': '🌐'
            };
            
            productsHTML += `
                <div class="product-card" data-category="${product.category}">
                    <div class="product-image">
                        ${product.imageURL ? `<img src="${product.imageURL}" alt="${product.name}">` : `<span>${categoryEmoji[product.category] || '📦'}</span>`}
                        <div class="badge">✓ Verified</div>
                    </div>
                    <div class="product-content">
                        <span class="product-category">${product.category}</span>
                        <h3 class="product-title">${product.name}</h3>
                        <p class="product-description">${product.description.substring(0, 100)}${product.description.length > 100 ? '...' : ''}</p>
                        <div style="font-size: 1.3rem; font-weight: 800; color: #667eea; margin-bottom: 0.8rem;">
                            $${product.price.toFixed(2)}
                        </div>
                        <div class="product-stats">
                            <div class="stat-item">
                                <div class="stat-number">${product.views || 0}</div>
                                <div class="stat-label">Views</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${product.sales || 0}</div>
                                <div class="stat-label">Sales</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-number">${(product.rating || 5.0).toFixed(1)}</div>
                                <div class="stat-label">Rating</div>
                            </div>
                        </div>
                        <div class="seller-info">
                            <strong>Seller:</strong> ${sellerName}<br>
                            <strong>Contact:</strong> ${product.contactEmail}
                        </div>
                        <div class="product-footer">
                            <button class="btn btn-primary" onclick="viewProduct('${productId}')" style="flex: 1;">View</button>
                            <button class="btn btn-success" onclick="generateQuickReferral('${productId}')" style="flex: 1;">Share</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        grid.innerHTML = productsHTML;
        console.log('✅ Marketplace loaded successfully');
        
    } catch (error) {
        console.error('Error loading marketplace:', error);
        grid.innerHTML = createSampleProducts();
    }
}

function createSampleProducts() {
    const samples = [
        { name: 'MBS Course Study', category: 'service', desc: '4 weeks to graduate or 16 weeks to Ambassador Trainer', price: 250, icon: '📚' },
        { name: 'TACEP Technical Courses', category: 'service', desc: 'NITA Trade Testing - Online & Physical', price: 450, icon: '🎓' },
        { name: 'Corporate Training', category: 'service', desc: 'Business entrepreneurship skills workshop', price: 25, icon: '💼' },
        { name: 'CBD Products', category: 'physical', desc: 'Health and beauty solutions', price: 120, icon: '💊' },
        { name: 'AI TaskMaster Pro', category: 'app', desc: 'AI-powered productivity suite', price: 49.99, icon: '📱' },
        { name: 'EcoSmart Bottle', category: 'physical', desc: 'Smart temperature-controlled bottle', price: 39.99, icon: '📦' },
    ];

    return samples.map((item, idx) => `
        <div class="product-card" data-category="${item.category}">
            <div class="product-image">
                <span>${item.icon}</span>
                <div class="badge">Sample</div>
            </div>
            <div class="product-content">
                <span class="product-category">${item.category}</span>
                <h3 class="product-title">${item.name}</h3>
                <p class="product-description">${item.desc}</p>
                <div style="font-size: 1.3rem; font-weight: 800; color: #667eea; margin-bottom: 0.8rem;">
                    $${item.price}
                </div>
                <div class="product-stats">
                    <div class="stat-item"><div class="stat-number">1.2K</div><div class="stat-label">Views</div></div>
                    <div class="stat-item"><div class="stat-number">89</div><div class="stat-label">Sales</div></div>
                    <div class="stat-item"><div class="stat-number">4.8</div><div class="stat-label">Rating</div></div>
                </div>
                <div class="seller-info">
                    <strong>Sample Product</strong><br>
                    Login and upload yours!
                </div>
                <div class="product-footer">
                    <button class="btn btn-primary" onclick="alert('Sample product. Create account to sell!')" style="flex: 1;">View</button>
                    <button class="btn btn-success" onclick="alert('Login to share products!')" style="flex: 1;">Share</button>
                </div>
            </div>
        </div>
    `).join('');
}

window.loadMarketplace = loadMarketplace;
window.viewProduct = async function(productId) {
    if (!window.currentUser) {
        alert('⚠️ Please login or create an account to view product details!');
        window.showPage('myAccount');
        return;
    }
    
    try {
        // Increment view count
        await updateDoc(doc(db, 'products', productId), {
            views: increment(1)
        });
        
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
            const product = productDoc.data();
            alert(`🔍 ${product.name}\n\n💰 Price: $${product.price}\n📝 ${product.description}\n\n📧 Contact: ${product.contactEmail}\n\n✨ Full product page coming soon!`);
        } else {
            alert('🔍 Product Details\n\nThis is a sample product.\n\nCreate an account and start selling your own products!');
        }
    } catch (error) {
        console.error('Error viewing product:', error);
        alert('🔍 Product Details\n\nCreate an account to view full product details and contact sellers!');
    }
};

// Replace in app.js
window.generateQuickReferral = async function(productId) {
    console.log('Generate referral called. User:', window.currentUser);
    
    if (!window.currentUser) {
        alert('⚠️ Please login first to generate referral links!\n\nReferral links help you earn commissions when people buy through your link.');
        if (window.showPage) {
            window.showPage('myAccount');
        }
        return;
    }

    const userId = window.currentUser.uid;
    const referralId = `${userId.substring(0, 8)}_${productId}_${Date.now()}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const referralLink = `${baseUrl}?ref=${referralId}&product=${productId}`;

    const message = `🎉 Referral Link Generated!\n\n💰 EARNINGS PER SALE:\n🥇 Level 1: 50 iKb points\n🥈 Level 2: 35 iKb points\n🥉 Level 3: 15 iKb points\n🏅 Level 4: 10 iKb points\n⭐ Level 5: 5 iKb points\n\n⛏️ Points auto-sync to Kabiru Mining!\n\n📱 Your referral link has been copied to clipboard!\n\nStart sharing now! 🚀`;

    try {
        // Try to copy to clipboard
        await navigator.clipboard.writeText(referralLink);
        
        // Save referral to database
        await addDoc(collection(db, 'referrals'), {
            userId: userId,
            productId: productId,
            referralId: referralId,
            referralLink: referralLink,
            clicks: 0,
            conversions: 0,
            earnings: 0,
            createdAt: serverTimestamp()
        });
        
        alert(message + '\n\n✅ Link copied to clipboard!');
        
    } catch (error) {
        console.error('Referral generation error:', error);
        // Fallback: show prompt
        prompt('📋 Copy your referral link:', referralLink);
    }
};

// ============================================
// INITIALIZE MARKETPLACE
// ============================================
setTimeout(() => {
    if (document.getElementById('marketplaceGrid')) {
        loadMarketplace();
        console.log('📦 Marketplace loading initiated');
    }
}, 1000);

// ============================================
// HIDE LOADING OVERLAY
// ============================================
window.addEventListener('load', () => {
    setTimeout(() => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
        }
        console.log('✅ App fully loaded and ready');
    }, 2000);
});

// Fallback
setTimeout(() => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
}, 5000);

console.log('📱 Tau Marketplace app.js fully loaded');
