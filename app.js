// app.js - FIXED VERSION
console.log('📱 Loading Tau Marketplace...');

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

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut, sendEmailVerification } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, orderBy, serverTimestamp, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyAaUOObFv8KU6KSYC7Uj9c2ELPjbdu-JX0",
    authDomain: "tau-marketplace.firebaseapp.com",
    projectId: "tau-marketplace",
    storageBucket: "tau-marketplace.firebasestorage.app",
    messagingSenderId: "692166197354",
    appId: "1:692166197354:web:b002dd1283f4b247a68a13"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

window.firebaseServices = { auth, db, storage };
window.currentUser = null;

// PWA Installation
let deferredPrompt;
const installPrompt = document.getElementById('installPrompt');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installPrompt.classList.add('show');
});

window.installPWA = async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response: ${outcome}`);
  deferredPrompt = null;
  installPrompt.classList.remove('show');
};

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('SW registered:', registration);
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });
}

// Generate Unique User Code
function generateUserCode() {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `TAU-${timestamp}-${randomStr}`;
}

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

// Enhanced User Registration with Unique Code
window.createAccount = async (event) => {
    event.preventDefault();
    
    const fullName = document.getElementById('regFullName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    
    if (password !== confirmPassword) {
        return alert('❌ Passwords do not match!');
    }
    
    if (password.length < 6) {
        return alert('❌ Password must be at least 6 characters');
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Send email verification
        await sendEmailVerification(user);
        
        // Generate unique code
        const userCode = generateUserCode();
        
        // Create user document with enhanced data
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
        
        // Send welcome email via EmailJS (you'll need to configure this)
        await sendWelcomeEmail(email, fullName, userCode);
        
        alert(`✅ Account Created Successfully!\n\n📧 Verification email sent to ${email}\n🔑 Your Unique Code: ${userCode}\n\nPlease check your email and verify your account.`);
        
        closeModal('registerModal');
        document.getElementById('registerForm').reset();
        
    } catch (error) {
        console.error('Registration error:', error);
        alert('❌ Registration failed: ' + error.message);
    }
};

// Load User Data with Enhanced Information
async function loadUserData() {
    if (!window.currentUser) return;
    
    document.getElementById('loginView').style.display = 'none';
    document.getElementById('accountDashboard').style.display = 'block';
    document.getElementById('memberEmail').textContent = window.currentUser.email;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', window.currentUser.uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Display user information
            document.getElementById('memberName').textContent = userData.fullName || 'Not set';
            document.getElementById('userCode').textContent = userData.userCode || 'N/A';
            document.getElementById('pointsDisplay').textContent = userData.points || 0;
            document.getElementById('salesDisplay').textContent = userData.sales || 0;
            document.getElementById('referralsDisplay').textContent = userData.referrals || 0;
            document.getElementById('productsDisplay').textContent = userData.products || 0;
            
            // Verification status
            const statusBadge = document.getElementById('verificationStatus');
            if (userData.verified) {
                statusBadge.textContent = '✓ Verified';
                statusBadge.className = 'verification-badge';
            } else {
                statusBadge.textContent = 'Pending';
                statusBadge.className = 'verification-badge pending';
            }
            
            // Enable transfer button if eligible
            if ((userData.points || 0) >= 1000) {
                document.getElementById('transferBtn').disabled = false;
            }
            
            // Profile photo
            if (userData.photoURL) {
                document.getElementById('profilePhoto').innerHTML = `<img src="${userData.photoURL}">`;
            }
            
            // Update last login
            await updateDoc(doc(db, 'users', window.currentUser.uid), {
                lastLogin: serverTimestamp()
            });
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Enhanced Product Submission with Two-Step Verification
window.submitProduct = async (event) => {
    event.preventDefault();
    
    if (!window.currentUser) {
        alert('⚠️ Please login first');
        showPage('myAccount');
        return;
    }
    
    const formData = new FormData(event.target);
    const file = formData.get('productImage');
    
    if (!file || file.size > 5 * 1024 * 1024) {
        return alert('❌ Please select an image under 5MB');
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;
    
    document.getElementById('uploadProgress').style.display = 'block';
    const progressBar = document.getElementById('uploadProgressBar');
    const progressText = document.getElementById('uploadProgressText');
    
    try {
        // Step 1: Upload image
        progressBar.style.width = '20%';
        progressBar.textContent = '20%';
        progressText.textContent = 'Uploading image...';
        
        const storageRef = ref(storage, `products/${window.currentUser.uid}/${Date.now()}_${file.name}`);
        const snapshot = await uploadBytes(storageRef, file);
        const imageURL = await getDownloadURL(snapshot.ref);
        
        progressBar.style.width = '50%';
        progressBar.textContent = '50%';
        progressText.textContent = 'Saving product details...';
        
        // Step 2: Create product document with verification status
        const productData = {
            userId: window.currentUser.uid,
            userEmail: window.currentUser.email,
            name: formData.get('productName'),
            category: formData.get('category'),
            description: formData.get('description'),
            price: parseFloat(formData.get('price')),
            imageURL: imageURL,
            contactEmail: formData.get('contactEmail'),
            verificationStatus: 'pending_initial', // Two-step: pending_initial -> pending_final -> approved
            verificationStep: 1,
            views: 0,
            sales: 0,
            rating: 5.0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const productRef = await addDoc(collection(db, 'products'), productData);
        
        progressBar.style.width = '80%';
        progressBar.textContent = '80%';
        progressText.textContent = 'Notifying admin...';
        
        // Step 3: Notify admin for review (via EmailJS)
        await notifyAdminNewProduct(productData, productRef.id);
        
        progressBar.style.width = '100%';
        progressBar.textContent = '100%';
        progressText.textContent = 'Complete!';
        
        setTimeout(() => {
            alert(`✅ Product Submitted Successfully!\n\n📋 Two-Step Verification Process:\n\n1️⃣ Initial Review (24-48 hours)\n   - Product details verification\n   - Image quality check\n   - Policy compliance\n\n2️⃣ Final Approval (12-24 hours)\n   - Quality assurance\n   - Pricing verification\n   - Final go-live approval\n\n📧 You will receive email notifications at each step.\n📱 Track status in your account dashboard.`);
            
            event.target.reset();
            document.getElementById('uploadProgress').style.display = 'none';
            progressBar.style.width = '0%';
            showPage('myAccount');
        }, 1000);
        
    } catch (error) {
        console.error('Product submission error:', error);
        alert('❌ Submission failed: ' + error.message);
    } finally {
        submitBtn.textContent = 'Submit for Verification';
        submitBtn.disabled = false;
    }
};

// Load Marketplace Products - FIXED VERSION
async function loadMarketplace() {
    const grid = document.getElementById('marketplaceGrid');
    
    if (!grid) {
        console.error('Marketplace grid element not found');
        return;
    }
    
    grid.innerHTML = '<div class="loading">Loading products...</div>';
    
    try {
        console.log('📦 Loading marketplace products...');
        
        // Try to load approved products
        const q = query(
            collection(db, 'products'),
            where('verificationStatus', '==', 'approved'),
            orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        
        console.log(`Found ${querySnapshot.size} approved products`);
        
        if (querySnapshot.empty) {
            // No approved products, show sample products
            console.log('No approved products, loading samples...');
            grid.innerHTML = createSampleProducts();
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
                console.warn('Could not fetch seller info:', err);
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
        
        // If error is about missing index, show sample products
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
            console.log('Index not created yet, showing sample products...');
            grid.innerHTML = createSampleProducts();
        } else {
            grid.innerHTML = '<div class="loading">❌ Error loading products. Showing samples...</div>';
            setTimeout(() => {
                grid.innerHTML = createSampleProducts();
            }, 2000);
        }
    }
}

// Create Sample Products (fallback)
function createSampleProducts() {
    const samples = [
        { name: 'MBS Course Study', category: 'service', desc: '4 weeks to graduate or 16 weeks to Ambassador Trainer', price: 250, icon: '📚' },
        { name: 'TACEP Technical Courses', category: 'service', desc: 'NITA Trade Testing - Online & Physical with certificates', price: 450, icon: '🎓' },
        { name: 'Corporate Training', category: 'service', desc: 'Business entrepreneurship skills workshop', price: 25, icon: '💼' },
        { name: 'CBD Products', category: 'physical', desc: 'Health and beauty solutions - Multiple sizes', price: 120, icon: '💊' },
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
                    Upload your products to start selling!
                </div>
                <div class="product-footer">
                    <button class="btn btn-primary" onclick="alert('This is a sample product. Upload yours to start selling!')" style="flex: 1;">View</button>
                    <button class="btn btn-success" onclick="alert('Login to generate referral links!')" style="flex: 1;">Share</button>
                </div>
            </div>
        </div>
    `).join('');
}

// Make functions globally available
window.loadMarketplace = loadMarketplace;
window.viewProduct = async function(productId) {
    alert('Product details coming soon!\nProduct ID: ' + productId);
};
window.generateQuickReferral = async function(productId) {
    if (!window.currentUser) {
        alert('⚠️ Please login first!');
        window.showPage('myAccount');
        return;
    }
    alert('Referral link generation coming soon!');
};

// EmailJS Integration
async function sendWelcomeEmail(email, name, userCode) {
    // Send Welcome Email
async function sendWelcomeEmail(email, name, userCode) {
    try {
        const templateParams = {
            to_email: email,
            to_name: name,
            user_email: email,
            user_code: userCode,
            message: 'Welcome to Tau Marketplace!'
        };

        await emailjs.send(
            'service_2hg2dxh',      // Replace with your Service ID
            'template_marketplace',     // Replace with your Welcome Template ID
            templateParams
        );
        
        console.log('✅ Welcome email sent to:', email);
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        // Don't block registration if email fails
    }
}

// Notify Admin of New Product
async function notifyAdminNewProduct(productData, productId) {
    try {
        const templateParams = {
            product_name: productData.name,
            product_category: productData.category,
            product_price: productData.price,
            product_description: productData.description,
            seller_email: productData.userEmail,
            seller_id: productData.userId,
            product_id: productId,
            admin_email: 'admin@taumarketplace.com' // Your admin email
        };

        await emailjs.send(
            'service_2hg2dxh',      // Replace with your Service ID
            'template_admin',   // Replace with your Admin Template ID
            templateParams
        );
        
        console.log('✅ Admin notification sent for product:', productId);
    } catch (error) {
        console.error('❌ Error sending admin notification:', error);
    }
}

// Send Product Approval Email
async function sendProductApprovalEmail(productData, sellerEmail, sellerName) {
    try {
        const templateParams = {
            to_email: sellerEmail,
            seller_name: sellerName,
            product_name: productData.name,
            product_url: window.location.origin + '/?product=' + productData.id
        };

        await emailjs.send(
            'service_2hg2dxh',      // Replace with your Service ID
            'template_marketplace',   // Replace with your Approval Template ID
            templateParams
        );
        
        console.log('✅ Approval email sent to:', sellerEmail);
    } catch (error) {
        console.error('❌ Error sending approval email:', error);
    }
}

// Send Order Confirmation Email
async function sendOrderConfirmation(orderData, buyerEmail, buyerName) {
    try {
        const templateParams = {
            to_email: buyerEmail,
            buyer_name: buyerName,
            order_id: orderData.orderId,
            product_name: orderData.productName,
            total_amount: orderData.totalAmount,
            order_date: new Date().toLocaleDateString()
        };

        await emailjs.send(
            'service_2hg2dxh',
            'template_order_confirm',
            templateParams
        );
        
        console.log('✅ Order confirmation sent');
    } catch (error) {
        console.error('❌ Error sending order confirmation:', error);
    }
}
    console.log('Welcome email would be sent to:', email);
    
    // Example EmailJS implementation:
    // emailjs.send('ynxh9_yo3dREGlzOe', 'YOUR_TEMPLATE_ID', {
    //     to_email: email,
    //     to_name: name,
    //     user_code: userCode,
    //     message: 'Welcome to Tau Marketplace!'
    // });
}

async function notifyAdminNewProduct(productData, productId) {
    console.log('Admin notification would be sent for product:', productId);
    // Implement EmailJS notification to admin
}

// Initialize on load
window.addEventListener('load', () => {
    loadMarketplace();
    
    // Check for URL parameters (referral tracking)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('ref')) {
        trackRef referral(urlParams.get('ref'));
    }
});

// Export functions to window
window.loadMarketplace = loadMarketplace;
window.loadUserData = loadUserData;


    <script>
        function showPage(pageId) {
            document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
        }

        function showModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        function togglePassword(inputId) {
            const input = document.getElementById(inputId);
            input.type = input.type === 'password' ? 'text' : 'password';
        }

        async function loginAccount() {
            const email = document.getElementById('accountEmail').value;
            const password = document.getElementById('accountPassword').value;
            if (!email || !password) return alert('Please enter email and password');

            try {
                const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                await signInWithEmailAndPassword(window.firebaseServices.auth, email, password);
                alert('✅ Login successful!');
            } catch (error) {
                alert('❌ Login failed: ' + error.message);
            }
        }

        async function createAccount() {
            const email = document.getElementById('accountEmail').value;
            const password = document.getElementById('accountPassword').value;
            if (!email || !password) return alert('Please enter email and password');
            if (password.length < 6) return alert('Password must be at least 6 characters');

            try {
                const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const userCredential = await createUserWithEmailAndPassword(window.firebaseServices.auth, email, password);
                
                await setDoc(doc(window.firebaseServices.db, 'users', userCredential.user.uid), {
                    email: email,
                    points: 0,
                    sales: 0,
                    referrals: 0,
                    products: 0,
                    createdAt: new Date().toISOString()
                });

                alert('✅ Account created successfully!');
            } catch (error) {
                alert('❌ Account creation failed: ' + error.message);
            }
        }

        async function logoutAccount() {
            try {
                const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                await signOut(window.firebaseServices.auth);
                showPage('buyProduct');
                alert('✅ Logged out successfully');
            } catch (error) {
                alert('❌ Logout failed: ' + error.message);
            }
        }

        async function sendPasswordReset() {
            const email = document.getElementById('resetEmail').value;
            if (!email) return alert('Please enter your email address');

            try {
                const { sendPasswordResetEmail } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                await sendPasswordResetEmail(window.firebaseServices.auth, email);
                alert('✅ Password reset email sent!');
                closeModal('resetPasswordModal');
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }

        async function submitProduct(e) {
            e.preventDefault();
            if (!window.currentUser) {
                alert('⚠️ Please login first');
                showPage('myAccount');
                return;
            }

            const formData = new FormData(e.target);
            const file = formData.get('productImage');
            if (!file || file.size > 5 * 1024 * 1024) return alert('Please select image under 5MB');

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.textContent = 'Uploading...';
            submitBtn.disabled = true;

            document.getElementById('uploadProgress').style.display = 'block';
            const progressBar = document.getElementById('uploadProgressBar');
            const progressText = document.getElementById('uploadProgressText');

            try {
                const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
                const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                progressBar.style.width = '20%';
                progressBar.textContent = '20%';
                progressText.textContent = 'Uploading image...';

                const storageRef = ref(window.firebaseServices.storage, `products/${window.currentUser.uid}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const imageURL = await getDownloadURL(snapshot.ref);

                progressBar.style.width = '60%';
                progressBar.textContent = '60%';
                progressText.textContent = 'Saving details...';

                await addDoc(collection(window.firebaseServices.db, 'products'), {
                    userId: window.currentUser.uid,
                    userEmail: window.currentUser.email,
                    name: formData.get('productName'),
                    category: formData.get('category'),
                    description: formData.get('description'),
                    price: parseFloat(formData.get('price')),
                    imageURL: imageURL,
                    contactEmail: formData.get('contactEmail'),
                    status: 'pending',
                    views: 0,
                    sales: 0,
                    rating: 5.0,
                    createdAt: serverTimestamp()
                });

                progressBar.style.width = '100%';
                progressBar.textContent = '100%';
                progressText.textContent = 'Complete!';

                setTimeout(() => {
                    alert('✅ Product Submitted!\n\n🎉 Congratulations! Admin will review within 24-48 hours.\n📧 You will receive notifications.\n🚀 Once approved, your product will be live!');
                    e.target.reset();
                    document.getElementById('uploadProgress').style.display = 'none';
                    progressBar.style.width = '0%';
                    showPage('myAccount');
                }, 1000);

            } catch (error) {
                alert('❌ Submission failed: ' + error.message);
            } finally {
                submitBtn.textContent = 'Submit for Verification';
                submitBtn.disabled = false;
            }
        }

        async function registerMarketeer(e) {
            e.preventDefault();
            const formData = new FormData(e.target);

            try {
                const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
                const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                
                const userCredential = await createUserWithEmailAndPassword(
                    window.firebaseServices.auth,
                    formData.get('email'),
                    formData.get('password')
                );
                
                await setDoc(doc(window.firebaseServices.db, 'users', userCredential.user.uid), {
                    email: formData.get('email'),
                    fullName: formData.get('fullName'),
                    role: 'marketeer',
                    points: 0,
                    sales: 0,
                    referrals: 0,
                    createdAt: new Date().toISOString()
                });

                alert('✅ Marketeer registration successful!\n\n🎯 Your referral system is active.\n⛏️ Earnings sync with Kabiru Mining!\n\nStart generating links!');
            } catch (error) {
                alert('❌ Registration failed: ' + error.message);
            }
        }

        function performSearch() {
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();
            const cards = document.querySelectorAll('.product-card');
            let found = 0;

            cards.forEach(card => {
                const title = card.querySelector('.product-title').textContent.toLowerCase();
                const desc = card.querySelector('.product-description').textContent.toLowerCase();

                if (title.includes(searchTerm) || desc.includes(searchTerm) || searchTerm === '') {
                    card.style.display = 'block';
                    found++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (found === 0) {
                document.getElementById('marketplaceGrid').innerHTML = '<div class="loading">No results found</div>';
            }
        }

        function filterCategory(category) {
            const cards = document.querySelectorAll('.product-card');
            const buttons = document.querySelectorAll('.filter-btn');

            buttons.forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');

            cards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        function showAdminPortal() {
            showModal('adminAccessModal');
        }

        function verifyAdminAccess() {
            const code = document.getElementById('adminCode').value;
            const validCodes = ['ADMIN2025', 'TAUADMIN', 'MAGERO2025'];
            
            if (validCodes.includes(code)) {
                closeModal('adminAccessModal');
                window.open('tau-admin-panel.html', '_blank');
            } else {
                alert('❌ Invalid access code');
            }
        }

        async function generateQuickReferral(productId) {
            if (!window.currentUser) {
                alert('⚠️ Please login first!');
                showPage('myAccount');
                return;
            }

            const userId = window.currentUser.uid;
            const referralId = `${userId.substring(0, 8)}_${productId}_${Date.now()}`;
            const baseUrl = window.location.origin + window.location.pathname;
            const referralLink = `${baseUrl}?ref=${referralId}`;

            const message = `🎉 Referral Link Generated!\n\n📋 Copy & share:\n${referralLink}\n\n💰 EARNINGS:\n🥇 Level 1: 50 iKb\n🥈 Level 2: 35 iKb\n🥉 Level 3: 15 iKb\n🏅 Level 4: 10 iKb\n⭐ Level 5: 5 iKb\n\n⛏️ Auto-syncs to Kabiru Mining!\n\nStart sharing! 🚀`;

            try {
                await navigator.clipboard.writeText(referralLink);
                alert(message);

                const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                await addDoc(collection(window.firebaseServices.db, 'referrals'), {
                    userId: userId,
                    productId: productId,
                    referralId: referralId,
                    referralLink: referralLink,
                    createdAt: new Date().toISOString()
                });
            } catch (error) {
                prompt('Copy your referral link:', referralLink);
            }
        }

        async function uploadProfilePhoto(event) {
            const file = event.target.files[0];
            if (!file || file.size > 5 * 1024 * 1024) return alert('Please select image under 5MB');
            if (!window.currentUser) return alert('Please login first');

            try {
                const { ref, uploadBytes, getDownloadURL } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js');
                const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

                const storageRef = ref(window.firebaseServices.storage, `profile-photos/${window.currentUser.uid}/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const photoURL = await getDownloadURL(snapshot.ref);

                await updateDoc(doc(window.firebaseServices.db, 'users', window.currentUser.uid), { photoURL: photoURL });

                document.getElementById('profilePhoto').innerHTML = `<img src="${photoURL}">`;
                alert('✅ Profile photo updated!');
            } catch (error) {
                alert('❌ Error uploading photo: ' + error.message);
            }
        }

        function viewProduct(productId) {
            alert('🔍 Product Details - Coming Soon!\n\nFull information, reviews, and purchase options.');
        }

        async function transferToKabiru() {
            if (!window.currentUser) return;

            try {
                const { doc, getDoc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
                const userDoc = await getDoc(doc(window.firebaseServices.db, 'users', window.currentUser.uid));
                const userData = userDoc.data();

                if ((userData.points || 0) < 1000) {
                    alert('⚠️ You need at least 1000 points to transfer.');
                    return;
                }

                const confirmTransfer = confirm(`💎 Transfer ${userData.points} iKb points to Kabiru Mining?`);
                
                if (confirmTransfer) {
                    await updateDoc(doc(window.firebaseServices.db, 'users', window.currentUser.uid), {
                        points: 0,
                        lastKabiruTransfer: new Date().toISOString()
                    });

                    alert('✅ Transfer Successful!\n\n' + userData.points + ' iKb points transferred to Kabiru Mining App!');
                    loadUserData();
                }
            } catch (error) {
                alert('❌ Transfer failed: ' + error.message);
            }
        }

        function toggleChat() {
            document.getElementById('chatWidget').classList.toggle('active');
        }

        function sendChatMessage() {
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            if (!message) return;

            const messagesContainer = document.getElementById('chatMessages');
            const userMsg = document.createElement('div');
            userMsg.className = 'chat-message user';
            userMsg.innerHTML = `<p>${message}</p>`;
            messagesContainer.appendChild(userMsg);
            input.value = '';

            setTimeout(() => {
                const adminMsg = document.createElement('div');
                adminMsg.className = 'chat-message admin';
                adminMsg.innerHTML = '<p>Thank you! Our support team will respond shortly.</p>';
                messagesContainer.appendChild(adminMsg);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 1000);

            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }

        window.showPage = showPage;
        window.showModal = showModal;
        window.closeModal = closeModal;
        window.togglePassword = togglePassword;
        window.loginAccount = loginAccount;
        window.createAccount = createAccount;
        window.logoutAccount = logoutAccount;
        window.sendPasswordReset = sendPasswordReset;
        window.submitProduct = submitProduct;
        window.registerMarketeer = registerMarketeer;
        window.performSearch = performSearch;
        window.filterCategory = filterCategory;
        window.showAdminPortal = showAdminPortal;
        window.verifyAdminAccess = verifyAdminAccess;
        window.generateQuickReferral = generateQuickReferral;
        window.uploadProfilePhoto = uploadProfilePhoto;
        window.viewProduct = viewProduct;
        window.transferToKabiru = transferToKabiru;
        window.toggleChat = toggleChat;
        window.sendChatMessage = sendChatMessage;
    </script>
