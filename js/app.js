// SnapSnap Main App Controller

const App = {
    user: null,
    userData: null,

    init() {
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = 'index.html';
                return;
            }

            this.user = user;

            // Load user data
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (!userDoc.exists) {
                auth.signOut();
                return;
            }

            this.userData = userDoc.data();
            this.setupUI();
            this.setupEventListeners();

            // Initialize modules
            Servers.init(user.uid);
            Friends.init(user.uid);

            // Hide loading, show app
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
        });
    },

    setupUI() {
        const initial = this.userData.username.charAt(0).toUpperCase();
        const avatar = document.getElementById('user-avatar');
        avatar.style.backgroundColor = this.userData.avatarColor;
        avatar.textContent = initial;
        document.getElementById('user-display-name').textContent = this.userData.username;
    },

    setupEventListeners() {
        // Home button
        document.getElementById('home-btn').addEventListener('click', () => this.goHome());

        // Add server
        document.getElementById('add-server-btn').addEventListener('click', () => {
            Servers.showCreateServerModal();
        });

        // Add channel
        document.getElementById('add-channel-btn').addEventListener('click', () => {
            Servers.showCreateChannelModal();
        });

        // Copy server ID on click
        document.getElementById('server-id-display').addEventListener('click', function () {
            navigator.clipboard.writeText(this.textContent);
            UI.toast('Server ID copied!', 'success');
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', () => {
            Servers.cleanup();
            Messages.cleanup();
            auth.signOut();
        });

        // Send message
        document.getElementById('message-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('message-input');
            Messages.send(input.value);
            input.value = '';
        });

        // Friends tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.tab;
                document.querySelectorAll('.friends-tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`friends-${tab}`).classList.add('active');
                if (tab === 'pending') Friends.loadPendingRequests();
            });
        });

        // Add friend form
        document.getElementById('add-friend-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const input = document.getElementById('friend-username-input');
            const status = document.getElementById('friend-request-status');
            const result = await Friends.sendFriendRequest(input.value.trim());
            status.textContent = result.message;
            status.style.color = result.success ? '#23a559' : '#fa777c';
            if (result.success) input.value = '';
        });

        // Friends nav item
        document.querySelector('[data-view="friends"]').addEventListener('click', () => {
            this.showFriendsView();
        });
    },

    goHome() {
        Servers.currentServer = null;
        Servers.currentChannel = null;
        Messages.cleanup();
        Servers.renderServerIcons();
        Friends.currentDM = null;
        Friends.renderDMList();

        document.getElementById('home-header').style.display = 'flex';
        document.getElementById('server-header').style.display = 'none';
        document.getElementById('home-nav').style.display = 'block';
        document.getElementById('server-channels').style.display = 'none';
        document.getElementById('home-btn').classList.add('active');

        this.showFriendsView();
    },

    showFriendsView() {
        document.getElementById('friends-view').style.display = 'flex';
        document.getElementById('friends-view').style.flexDirection = 'column';
        document.getElementById('chat-view').style.display = 'none';
        document.getElementById('welcome-view').style.display = 'none';
    }
};

// Start the app
App.init();
