// SnapSnap Friends & DMs

const Friends = {
    friends: [],
    currentDM: null,

    init(userId) {
        this.userId = userId;
        this.listenToFriends();
    },

    listenToFriends() {
        db.collection('users').doc(this.userId).onSnapshot((doc) => {
            const data = doc.data();
            if (data && data.friends) {
                this.loadFriendDetails(data.friends);
            }
        });
    },

    async loadFriendDetails(friendIds) {
        if (friendIds.length === 0) {
            this.friends = [];
            this.renderFriendsList();
            this.renderDMList();
            return;
        }

        // Firestore 'in' queries support max 10 at a time
        const batches = [];
        for (let i = 0; i < friendIds.length; i += 10) {
            const batch = friendIds.slice(i, i + 10);
            batches.push(
                db.collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
                    .get()
            );
        }

        const results = await Promise.all(batches);
        this.friends = results.flatMap(snap =>
            snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
        );

        this.renderFriendsList();
        this.renderDMList();
    },

    renderFriendsList() {
        const container = document.getElementById('friends-list');
        const noFriends = document.getElementById('no-friends');
        container.innerHTML = '';

        if (this.friends.length === 0) {
            noFriends.style.display = 'block';
            return;
        }

        noFriends.style.display = 'none';

        this.friends.forEach(friend => {
            const el = document.createElement('div');
            el.className = 'friend-item';
            el.innerHTML = `
                <div class="friend-info">
                    ${UI.avatar(friend.username.charAt(0).toUpperCase(), friend.avatarColor)}
                    <span style="font-weight:600">${UI.escapeHTML(friend.username)}</span>
                </div>
                <div class="friend-actions">
                    <button title="Message" data-dm-uid="${friend.id}">💬</button>
                </div>
            `;
            el.querySelector('[data-dm-uid]').addEventListener('click', () => this.openDM(friend));
            container.appendChild(el);
        });
    },

    renderDMList() {
        const container = document.getElementById('dm-list');
        container.innerHTML = '';

        this.friends.forEach(friend => {
            const el = document.createElement('div');
            el.className = `dm-item${this.currentDM?.id === friend.id ? ' active' : ''}`;
            el.innerHTML = `
                <div class="dm-avatar" style="background:${friend.avatarColor}">${friend.username.charAt(0).toUpperCase()}</div>
                <span>${UI.escapeHTML(friend.username)}</span>
            `;
            el.addEventListener('click', () => this.openDM(friend));
            container.appendChild(el);
        });
    },

    async openDM(friend) {
        this.currentDM = friend;
        Servers.currentServer = null;
        Servers.currentChannel = null;
        Servers.renderServerIcons();

        // Switch to DM view
        document.getElementById('home-header').style.display = 'flex';
        document.getElementById('server-header').style.display = 'none';
        document.getElementById('home-nav').style.display = 'block';
        document.getElementById('server-channels').style.display = 'none';
        document.getElementById('home-btn').classList.add('active');
        document.getElementById('friends-view').style.display = 'none';
        document.getElementById('chat-view').style.display = 'flex';
        document.getElementById('welcome-view').style.display = 'none';

        document.getElementById('chat-header-name').textContent = friend.username;
        document.querySelector('.chat-header-icon').textContent = '@';
        document.getElementById('message-input').placeholder = `Message @${friend.username}`;

        this.renderDMList();

        // Get or create DM document
        const dmId = this.getDMId(this.userId, friend.id);
        const dmRef = db.collection('dms').doc(dmId);
        const dmDoc = await dmRef.get();

        if (!dmDoc.exists) {
            await dmRef.set({
                participantIds: [this.userId, friend.id],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        // Listen to DM messages
        Messages.listen(dmRef.collection('messages'));
    },

    getDMId(uid1, uid2) {
        return [uid1, uid2].sort().join('_');
    },

    async sendFriendRequest(username) {
        try {
            const snapshot = await db.collection('users').where('username', '==', username).get();
            if (snapshot.empty) {
                return { success: false, message: 'User not found.' };
            }

            const targetDoc = snapshot.docs[0];
            const targetId = targetDoc.id;

            if (targetId === this.userId) {
                return { success: false, message: "You can't add yourself!" };
            }

            // Check if already friends
            const myDoc = await db.collection('users').doc(this.userId).get();
            if (myDoc.data().friends?.includes(targetId)) {
                return { success: false, message: "You're already friends!" };
            }

            // Check for existing pending request
            const existing = await db.collection('friend_requests')
                .where('from', '==', this.userId)
                .where('to', '==', targetId)
                .where('status', '==', 'pending')
                .get();

            if (!existing.empty) {
                return { success: false, message: 'Friend request already sent!' };
            }

            // If they already sent us a request, auto-accept
            const reverse = await db.collection('friend_requests')
                .where('from', '==', targetId)
                .where('to', '==', this.userId)
                .where('status', '==', 'pending')
                .get();

            if (!reverse.empty) {
                await this.acceptRequest(reverse.docs[0].id, targetId);
                return { success: true, message: `You and ${username} are now friends!` };
            }

            await db.collection('friend_requests').add({
                from: this.userId,
                to: targetId,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return { success: true, message: `Friend request sent to ${username}!` };
        } catch (err) {
            return { success: false, message: 'Error: ' + err.message };
        }
    },

    async acceptRequest(requestId, fromUserId) {
        const batch = db.batch();

        batch.update(db.collection('friend_requests').doc(requestId), { status: 'accepted' });

        batch.update(db.collection('users').doc(this.userId), {
            friends: firebase.firestore.FieldValue.arrayUnion(fromUserId)
        });
        batch.update(db.collection('users').doc(fromUserId), {
            friends: firebase.firestore.FieldValue.arrayUnion(this.userId)
        });

        await batch.commit();
    },

    async rejectRequest(requestId) {
        await db.collection('friend_requests').doc(requestId).update({ status: 'rejected' });
    },

    async loadPendingRequests() {
        const container = document.getElementById('pending-list');
        const noPending = document.getElementById('no-pending');
        container.innerHTML = '';

        const snapshot = await db.collection('friend_requests')
            .where('to', '==', this.userId)
            .where('status', '==', 'pending')
            .get();

        if (snapshot.empty) {
            noPending.style.display = 'block';
            return;
        }

        noPending.style.display = 'none';

        for (const doc of snapshot.docs) {
            const data = doc.data();
            const fromUser = await db.collection('users').doc(data.from).get();
            const fromData = fromUser.data();

            const el = document.createElement('div');
            el.className = 'friend-item';
            el.innerHTML = `
                <div class="friend-info">
                    ${UI.avatar(fromData.username.charAt(0).toUpperCase(), fromData.avatarColor)}
                    <div>
                        <div style="font-weight:600">${UI.escapeHTML(fromData.username)}</div>
                        <div style="font-size:12px;color:#949ba4">Incoming Friend Request</div>
                    </div>
                </div>
                <div class="friend-actions">
                    <button title="Accept" class="accept-btn" style="color:#23a559">✓</button>
                    <button title="Reject" class="reject-btn" style="color:#ed4245">✕</button>
                </div>
            `;

            el.querySelector('.accept-btn').addEventListener('click', async () => {
                await this.acceptRequest(doc.id, data.from);
                UI.toast('Friend request accepted!', 'success');
                this.loadPendingRequests();
            });

            el.querySelector('.reject-btn').addEventListener('click', async () => {
                await this.rejectRequest(doc.id);
                UI.toast('Friend request rejected.', 'info');
                this.loadPendingRequests();
            });

            container.appendChild(el);
        }
    }
};
