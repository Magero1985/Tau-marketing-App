// app.js - Tau Marketplace Main JavaScript Module

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, orderBy, serverTimestamp, getDoc, setDoc, increment } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Global variables
window.firebaseServices = { auth, db, storage };
window.currentUser = null;

// ============================================
// PWA INSTALLATION HANDLING
// ============================================

let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installPrompt) {
        installPrompt.classList.add('show');
    }
});

window.installPWA = async () => {
    if (!deferredPrompt) {
        alert('App installation is not available on this device/browser');
        return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
    }
    
    deferredPrompt = null;
    if (installPrompt) {
        installPrompt.classList.remove('show');
    }
};

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('✅ Service Worker registered:', registration.scope);
            })
            .catch((error) => {
                console.log('❌ Service Worker registration failed:', error);
            });
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate Unique User Code
function generateUserCode() {
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TAU-${timestamp}-${randomStr}`;
}

// Show Login View
function showLoginView() {
    const loginView = document.getElementById('loginView');
    const accountDashboard = document.getElementById('accountDashboard');
    
    if (loginView) loginView.style.display = 'block';
    if (accountDashboard) accountDashboard.style.display = 'none';
}

// Show Verification Reminder
function showVerificationReminder() {
    const reminder = document.createElement('div');
    reminder.style.cssText = 'position: fixed; top: 80px; left: 50%; transform: translateX(-50%); background: #FFA500; color: white; padding: 1rem; border-radius: 10px; z-index: 1001; max-width: 90%; text-align: center;';
    reminder.innerHTML = `
        <p style="margin: 0; font-weight: 600;">📧 Please verify your email address</p>
        <button onclick="this.parentElement.remove()" style="margin-top: 0.5rem; background: white; color: #FFA500; border: none; padding: 5px 15px; border-radius: 5px; cursor: pointer; font-weight: 600;">Dismiss</button>
    `;
    document.body.appendChild(reminder);
    
    setTimeout(() => {
        if (reminder.parentElement) reminder.remove();
    }, 10000);
}

// ============================================
// AUTHENTICATION HANDLERS
// ============================================

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.currentUser = user;
        await loadUserData();
        
        // Check for email verification
        if (!user.emailVerified) {
            showVerificationReminder();
        }
    } else {
        window.currentUser = null;
        showLoginView();
    }
});

// Login Account
window.loginAccount = async () => {
    const email = document.getElementById('accountEmail').value;
    const password = document.getElementById('accountPassword').value;
    
    if (!email || !password) {
        return alert('⚠️ Please enter email and password');
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        alert('✅ Login successful!');
        window.showPage('buyProduct');
    } catch (error) {
        console.error('Login error:', error);
        alert('❌ Login failed: ' + error.message);
    }
};

// Create Account with Enhanced Features
window.createAccount = async (event) => {
    event.preventDefault();
    
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (!fullName || !email || !password) {
        return alert('⚠️ Please fill in all fields');
    }
    
    if (password !== confirmPassword) {
        return alert('❌ Passwords do not match!');
    }
    
    if (password.length < 6) {
        return alert('❌ Password must be at least 6 characters');
    }
    
    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send email verification
        await sendEmailVerification(user);
        
        // Generate unique code
        const userCode = generateUserCode();
        
        // Create user document in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: email,
            fullName: fullName,
            userCode: userCode,
            points: 0,
            sales: 0,
            referrals: 0,
            products: 0,
            verified: false,
            emailVerified: false,
            role: 'user',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });
        
        // Send welcome email (placeholder for EmailJS integration)
        await sendWelcomeEmail(email, fullName, userCode);
        
        alert(`✅ Account Created Successfully!\n\n📧 Verification email sent to ${email}\n🔑 Your Unique Code: ${userCode}\n\nPlease check your email and verify your account.\n\n💡 Use this code across all Tau ecosystem apps!`);
        
        window.closeModal('registerModal');
        document.getElementById('registerForm').reset();
        
    } catch (error) {
        console.error('Registration error:', error);
        
        let errorMessage = 'Registration failed';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Please use a stronger password.';
        }
        
        alert('❌ ' + errorMessage);
    }
};

// Logout Account
window.logoutAccount = async () => {
    try {
        await signOut(auth);
        window.showPage('buyProduct');
        alert('✅ Logged out successfully');
    } catch (error) {
        console.error('Logout error:', error);
        alert('❌ Logout failed: ' + error.message);
    }
};

// Send Password Reset
window.sendPasswordReset = async () => {
    const email = document.getElementById('resetEmail').value;
    
    if (!email) {
        return alert('⚠️ Please enter your email address');
    }

    try {
        await sendPasswordResetEmail(auth, email);
        alert('✅ Password reset email sent! Please check your inbox.');
        window.closeModal('resetPasswordModal');
        document.getElementById('resetEmail').value = '';
    } catch (error) {
        console.error('Password reset error:', error);
        alert('❌ Error: ' + error.message);
    }
};

// ============================================
// USER DATA MANAGEMENT
// ============================================

// Load User Data
async function loadUserData() {
    if (!window.currentUser) return;
    
    const loginView = document.getElementById('loginView');
    const accountDashboard = document.getElementById('accountDashboard');
    
    if (loginView) loginView.style.display = 'none';
    if (accountDashboard) accountDashboard.style.display = 'block';
    
    // Set basic info
    const memberEmail = document.getElementById('memberEmail');
    if (memberEmail) memberEmail.textContent = window.currentUser.email;
    
    try {
        const userDocRef = doc(db, 'users', window.currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Display user information
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
            
            // Verification status
            const statusBadge = document.getElementById('verificationStatus');
            if (statusBadge) {
                if (userData.verified && window.currentUser.emailVerified) {
                    statusBadge.textContent = '✓ Verified';
                    statusBadge.className = 'verification-badge';
                } else if (window.currentUser.emailVerified) {
                    statusBadge.textContent = 'Email Verified';
                    statusBadge.className = 'verification-badge';
                } else {
                    statusBadge.textContent = 'Pending';
                    statusBadge.className = 'verification-badge pending';
                }
            }
            
            // Enable transfer button if eligible
            const transferBtn = document.getElementById('transferBtn');
            if (transferBtn && (userData.points || 0) >= 1000) {
                transferBtn.disabled = false;
            }
            
            // Profile photo
            const profilePhoto = document.getElementById('profilePhoto');
            if (profilePhoto && userData.photoURL) {
                profilePhoto.innerHTML = `<img src="${userData.photoURL}" alt="Profile">`;
            }
            
            // Update last login
            await updateDoc(userDocRef, {
                lastLogin: serverTimestamp(),
                emailVerified: window.currentUser.emailVerified
            });
        } else {
            // Create user document if it doesn't exist
            await setDoc(userDocRef, {
                uid: window.currentUser.uid,
                email: window.currentUser.email,
                fullName: window.currentUser.displayName || 'User',
                userCode: generateUserCode(),
                points: 0,
                sales: 0,
                referrals: 0,
                products: 0,
                verified: false,
                emailVerified: window.currentUser.emailVerified,
                role: 'user',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp()
            });
            
            // Reload data
            await loadUserData();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Upload Profile Photo
window.uploadProfilePhoto = async (event) => {
    const file = event.target.files[0];
    
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        return alert('❌ Please select an image under 5MB');
    }
    
    if (!window.currentUser) {
        return alert('⚠️ Please login first');
    }

    try {
        const storageRef = ref(storage, `profile-photos/${window.currentUser.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const photoURL = await getDownloadURL(snapshot.ref);

        await updateDoc(doc(db, 'users', window.currentUser.uid), { 
            photoURL: photoURL 
        });

        const profilePhoto = document.getElementById('profilePhoto');
        if (profilePhoto) {
            profilePhoto.innerHTML = `<img src="${photoURL}" alt="Profile">`;
        }
        
        alert('✅ Profile photo updated successfully!');
    } catch (error) {
        console.error('Photo upload error:', error);
        alert('❌ Error uploading photo: ' + error.message);
    }
};

// ============================================
// PRODUCT MANAGEMENT
// ============================================

// Submit Product with Two-Step Verification
window.submitProduct = async (event) => {
    event.preventDefault();
    
    if (!window.currentUser) {
        alert('⚠️ Please login first to sell products');
        window.showPage('myAccount');
        return;
    }
    
    const formData = new FormData(event.target);
    const file = formData.get('productImage');
    
    if (!file) {
        return alert('❌ Please select a product image');
    }
    
    if (file.size > 5 * 1024 * 1024) {
        return alert('❌ Image size must be under 5MB');
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;
    
    const uploadProgress = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');
    
    if (uploadProgress) uploadProgress.style.display = 'block';
    
    try {
        // Step 1: Upload image
        if (progressBar) {
            progressBar.style.width = '20%';
            progressBar.textContent = '20%';
        }
        if (progressText) progressText.textContent = 'Uploading image...';
        
        const timestamp = Date.now();
        const storageRef = ref(storage, `products/${window.currentUser.uid}/${timestamp}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const imageURL = await getDownloadURL(snapshot.ref);
        
        if (progressBar) {
            progressBar.style.width = '50%';
            progressBar.textContent = '50%';
        }
        if (progressText) progressText.textContent = 'Saving product details...';
        
        // Step 2: Create product document
        const productData = {
            userId: window.currentUser.uid,
            userEmail: window.currentUser.email,
            name: formData.get('productName'),
            category: formData.get('category'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            imageURL: imageURL,
            contactEmail: formData.get('contactEmail'),
            verificationStatus: 'pending_initial',
            verificationStep: 1,
            views: 0,
            sales: 0,
            rating: 5.0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const productRef = await addDoc(collection(db, 'products'), productData);
        
        if (progressBar) {
            progressBar.style.width = '80%';
            progressBar.textContent = '80%';
        }
        if (progressText) progressText.textContent = 'Notifying admin...';
        
        // Update user's product count
        await updateDoc(doc(db, 'users', window.currentUser.uid), {
            products: increment(1)
        });
        
        // Step 3: Notify admin (placeholder)
        await notifyAdminNewProduct(productData, productRef.id);
        
        if (progressBar) {
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';
        }
        if (progressText) progressText.textContent = 'Complete!';
        
        setTimeout(() => {
            alert(`✅ Product Submitted Successfully!\n\n📋 Two-Step Verification Process:\n\n1️⃣ Initial Review (24-48 hours)\n   • Product details verification\n   • Image quality check\n   • Policy compliance\n\n2️⃣ Final Approval (12-24 hours)\n   • Quality assurance\n   • Pricing verification\n   • Final go-live approval\n\n📧 You will receive email notifications at each step.\n📱 Track status in your account dashboard.\n\nThank you for listing with Tau Marketplace!`);
            
            event.target.reset();
            if (uploadProgress) uploadProgress.style.display = 'none';
            if (progressBar) progressBar.style.width = '0%';
            
            window.showPage('myAccount');
            loadUserData();
        }, 1500);
        
    } catch (error) {
        console.error('Product submission error:', error);
        alert('❌ Submission failed: ' + error.message);
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
};

// Load Marketplace Products
async function loadMarketplace() {
    const grid = document.getElementById('marketplaceGrid');
    
    if (!grid) return;
    
    try {
        const q = query(
            collection(db, 'products'),
            where('verificationStatus', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            grid.innerHTML = `
                <div class="loading">
                    <p>🏪 No products available yet</p>
                    <p style="margin-top: 1rem; font-size: 0.9rem; color: #718096;">Be the first to list your product!</p>
                </div>
            `;
            return;
        }
        
        let productsHTML = '';
        
        for (const docSnap of querySnapshot.docs) {
            const product = docSnap.data();
            const productId = docSnap.id;
            
            // Get seller info
            let sellerName = 'Anonymous';
            try {
                const sellerDoc = await getDoc(doc(db, 'users', product.userId));
                if (sellerDoc.exists()) {
                    sellerName = sellerDoc.data().fullName || 'Anonymous';
                }
            } catch (err) {
                console.error('Error fetching seller:', err);
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
                            <button class="btn btn-success" onclick="generateQuickReferral('${productId}')" style="flex: 1;">Share & Earn</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        grid.innerHTML = productsHTML;
        
    } catch (error) {
        console.error('Error loading marketplace:', error);
        grid.innerHTML = '<div class="loading">❌ Error loading products. Please refresh.</div>';
    }
}

// View Product Details
window.viewProduct = async (productId) => {
    if (!productId) return;
    
    try {
        // Increment view count
        await updateDoc(doc(db, 'products', productId), {
            views: increment(1)
        });
        
        const productDoc = await getDoc(doc(db, 'products', productId));
        if (productDoc.exists()) {
            const product = productDoc.data();
            alert(`🔍 ${product.name}\n\n💰 Price: $${product.price}\n📝 ${product.description}\n\n📧 Contact: ${product.contactEmail}\n\n✨ Full product details page coming soon!`);
        }
    } catch (error) {
        console.error('Error viewing product:', error);
        alert('❌ Error loading product details');
    }
};

// ============================================
// REFERRAL SYSTEM
// ============================================

// Generate Quick Referral
window.generateQuickReferral = async (productId) => {
    if (!window.currentUser) {
        alert('⚠️ Please login first to generate referral links!');
        window.showPage('myAccount');
        return;
    }

    const userId = window.currentUser.uid;
    const referralId = `${userId.substring(0, 8)}_${productId}_${Date.now()}`;
    const baseUrl = window.location.origin + window.location.pathname;
    const referralLink = `${baseUrl}?ref=${referralId}&product=${productId}`;

    const message = `🎉 Referral Link Generated!\n\n📋 Your Link:\n${referralLink}\n\n💰 EARNINGS PER SALE:\n🥇 Level 1: 50 iKb points\n🥈 Level 2: 35 iKb points\n🥉 Level 3: 15 iKb points\n🏅 Level 4: 10 iKb points\n⭐ Level 5: 5 iKb points\n\n⛏️ Points auto-sync to Kabiru Mining!\n\n📱 Share on social media to maximize earnings!\n\nStart earning now! 🚀`;

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
        alert(message);
    }
};

// Track Referral from URL
async function trackReferral(refCode) {
    if (!refCode) return;
    
    try {
        const referralQuery = query(
            collection(db, 'referrals'),
            where('referralId', '==', refCode)
        );
        
        const querySnapshot = await getDocs(referralQuery);
        
        if (!querySnapshot.empty) {
            const referralDoc = querySnapshot.docs[0];
            
            // Increment click count
            await updateDoc(doc(db, 'referrals', referralDoc.id), {
                clicks: increment(1),
                lastClickedAt: serverTimestamp()
            });
            
            console.log('Referral tracked:', refCode);
        }
    } catch (error) {
        console.error('Error tracking referral:', error);
    }
}

// ============================================
// MARKETEER REGISTRATION
// ============================================

window.registerMarketeer = async (event) => {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const fullName = formData.get('fullName');
    const email = formData.get('email');
    const password = formData.get('password');

    if (!fullName || !email || !password) {
        return alert('⚠️ Please fill in all fields');
    }

    if (password.length < 6) {
        return alert('❌ Password must be at least 6 characters');
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await sendEmailVerification(user);
        
        const userCode = generateUserCode();
        
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            email: email,
            fullName: fullName,
            userCode: userCode,
            role: 'marketeer',
            points: 0,
            sales: 0,
            referrals: 0,
            products: 0,
            verified: false,
            emailVerified: false,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        });

        alert(`✅ Marketeer Registration Successful!\n\n🎯 Your referral system is now active!\n🔑 Your Code: ${userCode}\n⛏️ Earnings sync with Kabiru Mining!\n\n📧 Verification email sent to ${email}\n\nStart generating referral links and earning!`);
        
        event.target.reset();
        window.showPage('myAccount');
        
    } catch (error) {
        console.error('Marketeer registration error:', error);
        
        let errorMessage = 'Registration failed';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered.';
        }
        
        alert('❌ ' + errorMessage);
    }
};

// ============================================
// POINTS TRANSFER TO KABIRU
// ============================================

window.transferToKabiru = async () => {
    if (!window.currentUser) return;

    try {
        const userDoc = await getDoc(doc(db, 'users', window.currentUser.uid));
        const userData = userDoc.data();

        if (!userData || (userData.points || 0) < 1000) {
            alert('⚠️ You need at least 1000 iKb points to transfer.\n\nCurrent balance: ' + (userData?.points || 0) + ' iKb');
            return;
        }

        const confirmTransfer = confirm(`💎
