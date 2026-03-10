// SnapSnap Messages

const Messages = {
    unsubscribe: null,
    currentRef: null,

    listen(collectionRef) {
        // Unsubscribe from previous listener
        if (this.unsubscribe) this.unsubscribe();

        this.currentRef = collectionRef;
        const container = document.getElementById('messages');
        container.innerHTML = '';

        this.unsubscribe = collectionRef
            .orderBy('timestamp')
            .limitToLast(100)
            .onSnapshot((snapshot) => {
                container.innerHTML = '';
                snapshot.docs.forEach(doc => {
                    const msg = doc.data();
                    this.renderMessage(container, msg);
                });
                this.scrollToBottom();
            });
    },

    renderMessage(container, msg) {
        const div = document.createElement('div');
        div.className = 'message';

        const letter = (msg.senderName || '?').charAt(0).toUpperCase();
        const color = msg.senderColor || '#5865f2';

        div.innerHTML = `
            <div class="message-avatar" style="background:${color}">${letter}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author" style="color:${color}">${UI.escapeHTML(msg.senderName || 'Unknown')}</span>
                    <span class="message-timestamp">${UI.formatTime(msg.timestamp)}</span>
                </div>
                <div class="message-text">${UI.escapeHTML(msg.text || '')}</div>
            </div>
        `;

        container.appendChild(div);
    },

    scrollToBottom() {
        const container = document.getElementById('messages-container');
        container.scrollTop = container.scrollHeight;
    },

    async send(text) {
        if (!this.currentRef || !text.trim()) return;

        const user = auth.currentUser;
        if (!user) return;

        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        await this.currentRef.add({
            text: text.trim(),
            senderId: user.uid,
            senderName: userData.username,
            senderColor: userData.avatarColor,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    cleanup() {
        if (this.unsubscribe) this.unsubscribe();
    }
};
