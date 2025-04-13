// Variables globales
let currentUser = null;
let currentGroupId = null;
let currentChatId = null;  // Para identificar el chat privado actual
let groups = [];
let messages = {};
let privateChats = {};  // Para almacenar chats privados entre usuarios
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingDuration = 0;

// Variable para almacenar el rol que se está seleccionando
let currentSelectingRole = null;

// Emojis comunes para el selector
const commonEmojis = [
    '😀', '😂', '😍', '🥰', '😊', '😎', '😢', '😭', '😡', '🥺',
    '👍', '👎', '👏', '🙌', '🤝', '👋', '✌️', '🤞', '🤙', '👌',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💯', '💢',
    '🎉', '🎊', '🎁', '🎈', '🔥', '✨', '🌟', '💫', '💥', '💦'
];

// Inicializar la aplicación cuando se cargue el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar elementos de la UI
    initializeUI();
    
    // Cargar usuarios y grupos del almacenamiento local
    loadFromLocalStorage();
    
    // Inicializar el selector de emojis
    initializeEmojiPicker();
});

// Inicializar elementos de la UI y eventos
function initializeUI() {
    // Formularios de autenticación
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    
    // Cambio de tabs en la autenticación
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            const target = this.getAttribute('data-target');
            
            // Cambiar clases activas
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Mostrar el formulario correcto
            document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
            document.getElementById(target).style.display = 'block';
        });
    });
    
    // Botones de navegación principal
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    document.getElementById('create-group-btn').addEventListener('click', showCreateGroupModal);
    document.getElementById('group-info-btn').addEventListener('click', showGroupInfoModal);
    
    // Botones del área de mensaje
    document.getElementById('attachment-btn').addEventListener('click', toggleAttachmentOptions);
    document.getElementById('emoji-btn').addEventListener('click', toggleEmojiPicker);
    document.getElementById('voice-btn').addEventListener('click', startVoiceRecording);
    document.getElementById('send-message-btn').addEventListener('click', sendMessage);
    document.getElementById('message-input').addEventListener('keypress', e => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Botones de adjuntos
    document.getElementById('image-upload').addEventListener('click', () => triggerFileUpload('image'));
    document.getElementById('video-upload').addEventListener('click', () => triggerFileUpload('video'));
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    
    // Botones de grabación de voz
    document.getElementById('cancel-recording').addEventListener('click', cancelVoiceRecording);
    document.getElementById('stop-recording').addEventListener('click', stopVoiceRecording);
    
    // Botones de modales
    document.querySelectorAll('.close-modal').forEach(button => {
        button.addEventListener('click', closeModals);
    });
    
    // Cerrar modal de información del grupo
    document.getElementById('close-group-info').addEventListener('click', function() {
        document.getElementById('group-info-modal').style.display = 'none';
    });
    
    // Formulario de creación de grupo
    document.getElementById('create-group-form').addEventListener('submit', createGroup);
    
    // Botón para salir de un grupo
    document.getElementById('leave-group-btn').addEventListener('click', leaveGroup);
    
    // Búsqueda de grupos
    document.getElementById('search-groups').addEventListener('input', searchGroups);
    
    // Botón para añadir miembros (mostrar formulario)
    document.getElementById('add-member-btn').addEventListener('click', function() {
        document.getElementById('add-member-form').style.display = 'block';
        document.getElementById('member-email').focus();
    });
    
    // Cancelar añadir miembro
    document.getElementById('cancel-add-member').addEventListener('click', function() {
        document.getElementById('add-member-form').style.display = 'none';
        document.getElementById('member-email').value = '';
    });
    
    // Enviar formulario para añadir miembro
    document.getElementById('add-member-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const groupId = document.querySelector('.modal.active').getAttribute('data-group-id');
        const memberEmail = document.getElementById('member-email').value.trim();
        addMemberToGroup(groupId, memberEmail);
    });
    
    // Botón para eliminar grupo
    document.getElementById('delete-group-btn').addEventListener('click', function() {
        const groupId = currentGroupId;
        if (groupId) {
            deleteGroup(groupId);
        }
    });

    // Botones de grupo
    document.querySelectorAll('.group-action').forEach(button => {
        button.addEventListener('click', function() {
            const groupId = this.closest('.group-item').dataset.id;
            
            if (this.classList.contains('show-group-info')) {
                showGroupInfo(groupId);
            } else if (this.classList.contains('delete-group')) {
                if (confirm('¿Estás seguro de eliminar este grupo?')) {
                    deleteGroup(groupId);
                }
            }
        });
    });

    // Mostrar formulario de añadir miembro
    document.getElementById('add-member-button').addEventListener('click', function() {
        const addMemberForm = document.getElementById('add-member-form');
        addMemberForm.style.display = 'block';
        document.getElementById('member-email').focus();
    });

    // Cancelar añadir miembro
    document.getElementById('cancel-add-member').addEventListener('click', function() {
        document.getElementById('add-member-form').style.display = 'none';
    });

    // Botones para seleccionar miembros
    document.getElementById('select-vice-president').addEventListener('click', () => {
        openSelectMemberModal('vice-president');
    });
    
    document.getElementById('select-governor').addEventListener('click', () => {
        openSelectMemberModal('governor');
    });
    
    // Cerrar modal de selección de miembros
    document.getElementById('cancel-select-member').addEventListener('click', () => {
        document.getElementById('select-member-modal').style.display = 'none';
    });
    
    // Buscar miembros en el modal de selección
    document.getElementById('search-members').addEventListener('input', filterMembersList);

    // Botones para mensajes privados
    document.getElementById('private-chats-btn').addEventListener('click', showPrivateChats);
    document.getElementById('group-chats-btn').addEventListener('click', showGroupChats);
    document.getElementById('new-private-chat-btn').addEventListener('click', showNewChatModal);
}

// Cerrar todos los modales
function closeModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    document.getElementById('voice-recorder-overlay').style.display = 'none';
    
    // Ocultar opciones de adjuntos y emojis
    document.getElementById('attachment-options').style.display = 'none';
    document.getElementById('emoji-picker').style.display = 'none';
}

// Cargar datos del almacenamiento local
function loadFromLocalStorage() {
    // Cargar usuario actual
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
        updateUserUI();
    }
    
    // Cargar grupos
    const savedGroups = localStorage.getItem('groups');
    if (savedGroups) {
        groups = JSON.parse(savedGroups);
        renderGroups();
    }
    
    // Cargar mensajes
    const savedMessages = localStorage.getItem('messages');
    if (savedMessages) {
        messages = JSON.parse(savedMessages);
    }
    
    // Cargar chats privados
    const savedChats = localStorage.getItem('privateChats');
    if (savedChats) {
        privateChats = JSON.parse(savedChats);
    }
}

// Guardar datos en el almacenamiento local
function saveToLocalStorage() {
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    localStorage.setItem('groups', JSON.stringify(groups));
    localStorage.setItem('messages', JSON.stringify(messages));
    localStorage.setItem('privateChats', JSON.stringify(privateChats));
}

// Inicializar el selector de emojis
function initializeEmojiPicker() {
    const emojiPicker = document.getElementById('emoji-picker');
    
    // Limpiar contenido existente
    emojiPicker.innerHTML = '';
    
    // Añadir cada emoji al picker
    commonEmojis.forEach(emoji => {
        const emojiElement = document.createElement('div');
        emojiElement.classList.add('emoji');
        emojiElement.textContent = emoji;
        emojiElement.addEventListener('click', () => {
            const messageInput = document.getElementById('message-input');
            messageInput.value += emoji;
            toggleEmojiPicker(); // Cerrar el picker después de seleccionar
        });
        
        emojiPicker.appendChild(emojiElement);
    });
}

// Manejo de autenticación
function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Validar campos
    if (!email || !password) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    // Buscar usuario en localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Guardar usuario actual (sin la contraseña por seguridad)
        currentUser = {
            id: user.id,
            name: user.name,
            email: user.email
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Mostrar la aplicación
        showApp();
        updateUserUI();
        renderGroups();
    } else {
        alert('Email o contraseña incorrectos');
    }
}

function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    // Validar campos
    if (!name || !email || !password || !confirmPassword) {
        alert('Por favor completa todos los campos');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        return;
    }
    
    // Obtener usuarios existentes
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Verificar si el email ya existe
    if (users.some(u => u.email === email)) {
        alert('Este email ya está registrado');
        return;
    }
    
    // Crear nuevo usuario
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password // En una app real, la contraseña debe estar encriptada
    };
    
    // Añadir a la lista de usuarios
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Guardar usuario actual (sin la contraseña por seguridad)
    currentUser = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    };
    
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    
    // Mostrar la aplicación
    showApp();
    updateUserUI();
    renderGroups();
}

function handleLogout() {
    // Eliminar usuario actual
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Mostrar pantalla de autenticación
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    
    // Limpiar formularios
    document.getElementById('login-form').reset();
    document.getElementById('register-form').reset();
}

// Mostrar la aplicación principal
function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    
    // Aplicar tema dominicano
    applyDominicanTheme();
    
    // Actualizar interfaz del usuario
    updateUserUI();
}

// Actualizar UI con la información del usuario
function updateUserUI() {
    if (currentUser) {
        // Mostrar inicial del usuario
        document.getElementById('user-initial').textContent = currentUser.name.charAt(0).toUpperCase();
        
        // Mostrar nombre del usuario
        document.getElementById('user-name').textContent = currentUser.name;
    }
}

// Funcionalidad de creación y gestión de grupos
function showCreateGroupModal() {
    const modal = document.getElementById('create-group-modal');
    modal.style.display = 'flex';
}

function showGroupInfoModal() {
    if (!currentGroupId) return;
    
    const group = groups.find(g => g.id === currentGroupId);
    if (!group) return;
    
    // Actualizar la información del grupo en el modal
    document.getElementById('group-info-icon').className = `fas fa-${group.icon || 'users'}`;
    document.getElementById('group-info-name').textContent = group.name;
    document.getElementById('group-info-description').textContent = group.description || 'Sin descripción';
    
    // Formatear fecha de creación
    const createdDate = new Date(group.createdAt);
    const formattedDate = createdDate.toLocaleDateString();
    document.getElementById('group-info-date').innerHTML = `Creado: <span>${formattedDate}</span>`;
    
    // Cargar miembros
    const membersList = document.getElementById('group-members-list');
    membersList.innerHTML = '';
    
    // Obtener usuarios
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    group.members.forEach(memberId => {
        const member = users.find(u => u.id === memberId);
        if (member) {
            const memberItem = document.createElement('li');
            memberItem.classList.add('member-item');
            memberItem.innerHTML = `
                <div class="member-avatar">${member.name.charAt(0).toUpperCase()}</div>
                <div class="member-name">${member.name}</div>
            `;
            membersList.appendChild(memberItem);
        }
    });
    
    // Mostrar el modal
    document.getElementById('group-info-modal').style.display = 'flex';
}

function leaveGroup() {
    if (!currentGroupId) return;
    
    if (confirm('¿Estás seguro de que deseas salir de este grupo?')) {
        // Encontrar el grupo
        const groupIndex = groups.findIndex(g => g.id === currentGroupId);
        if (groupIndex === -1) return;
        
        // Si el usuario es el creador, no puede salir
        if (groups[groupIndex].creator === currentUser.id) {
            alert('No puedes salir del grupo porque eres el creador');
            return;
        }
        
        // Eliminar al usuario de los miembros
        const memberIndex = groups[groupIndex].members.indexOf(currentUser.id);
        if (memberIndex !== -1) {
            groups[groupIndex].members.splice(memberIndex, 1);
        }
        
        // Guardar cambios
        saveToLocalStorage();
        
        // Actualizar UI
        renderGroups();
        
        // Cerrar el modal y deseleccionar el grupo
        closeModals();
        currentGroupId = null;
        updateGroupHeader();
        document.getElementById('messages-container').innerHTML = `
            <div class="no-group-selected">
                <i class="fas fa-comments"></i>
                <p>Selecciona o crea un grupo para comenzar a chatear</p>
            </div>
        `;
        
        // Desactivar área de entrada de mensajes
        document.getElementById('message-input-area').style.display = 'none';
    }
}

function selectGroup(groupId) {
    currentGroupId = groupId;
    
    // Actualizar UI de grupos
    document.querySelectorAll('.group-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`.group-item[data-id="${groupId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Actualizar encabezado del grupo
    updateGroupHeader();
    
    // Cargar mensajes
    loadMessages();
    
    // Mostrar área de entrada de mensajes
    document.getElementById('message-input-area').style.display = 'flex';
}

function updateGroupHeader() {
    const headerGroupName = document.getElementById('current-group-name');
    const headerGroupMembers = document.getElementById('current-group-members');
    
    if (!currentGroupId) {
        headerGroupName.textContent = 'Selecciona un grupo';
        headerGroupMembers.textContent = '0 miembros';
        return;
    }
    
    const group = groups.find(g => g.id === currentGroupId);
    if (!group) return;
    
    headerGroupName.textContent = group.name;
    headerGroupMembers.textContent = `${group.members.length} miembros`;
    
    // Actualizar icono del grupo
    const groupAvatar = document.querySelector('.group-avatar i');
    groupAvatar.className = `fas fa-${group.icon || 'users'}`;
}

function searchGroups() {
    const searchTerm = document.getElementById('search-groups').value.toLowerCase();
    const groupsList = document.getElementById('groups-list');
    
    // Si el término de búsqueda está vacío, mostrar todos los grupos
    if (!searchTerm) {
        renderGroups();
        return;
    }
    
    // Filtrar grupos según el término de búsqueda
    const filteredGroups = groups.filter(group => 
        group.members.includes(currentUser.id) && 
        group.name.toLowerCase().includes(searchTerm)
    );
    
    groupsList.innerHTML = '';
    
    if (filteredGroups.length === 0) {
        const noResults = document.createElement('div');
        noResults.classList.add('no-groups');
        noResults.innerHTML = `<p>No se encontraron grupos</p>`;
        groupsList.appendChild(noResults);
        return;
    }
    
    // Renderizar los grupos filtrados
    filteredGroups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.classList.add('group-item');
        groupElement.setAttribute('data-id', group.id);
        
        if (currentGroupId === group.id) {
            groupElement.classList.add('active');
        }
        
        groupElement.innerHTML = `
            <div class="group-item-avatar">
                <i class="fas fa-${group.icon || 'users'}"></i>
            </div>
            <div class="group-item-info">
                <div class="group-item-name">${group.name}</div>
                <div class="group-item-last-message">${group.description || 'Sin descripción'}</div>
            </div>
        `;
        
        groupElement.addEventListener('click', () => {
            selectGroup(group.id);
        });
        
        groupsList.appendChild(groupElement);
    });
}

// Funcionalidad de mensajes
function loadMessages() {
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '';
    
    // Verificar si hay un grupo o chat privado seleccionado
    if (!currentGroupId && !currentChatId) {
        messagesContainer.innerHTML = `
            <div class="no-group-selected">
                <i class="fas fa-comments"></i>
                <p>Selecciona o inicia una conversación para comenzar a chatear</p>
            </div>
        `;
        return;
    }
    
    // Determinar ID para cargar mensajes
    const messageId = currentGroupId || currentChatId;
    const chatMessages = messages[messageId] || [];
    
    if (chatMessages.length === 0) {
        const noMessages = document.createElement('div');
        noMessages.classList.add('no-messages');
        
        // Texto personalizado según sea grupo o chat privado
        if (currentGroupId) {
            const group = groups.find(g => g.id === currentGroupId);
            noMessages.innerHTML = `
                <p>Aún no hay ${group && group.format === 'forum' ? 'publicaciones' : 'mensajes'} en este grupo</p>
                <p>¡Sé el primero en ${group && group.format === 'forum' ? 'publicar' : 'enviar algo'}!</p>
            `;
        } else {
            noMessages.innerHTML = `
                <p>Aún no hay mensajes en esta conversación</p>
                <p>¡Envía un mensaje para comenzar!</p>
            `;
        }
        
        messagesContainer.appendChild(noMessages);
        return;
    }
    
    // Obtener lista de usuarios
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Si es un grupo y tiene formato de foro
    if (currentGroupId) {
        const group = groups.find(g => g.id === currentGroupId);
        if (group && group.format === 'forum') {
            // Crear contenedor de foro
            const forumContainer = document.createElement('div');
            forumContainer.classList.add('forum-container');
            
            // Renderizar mensajes como posts de foro
            chatMessages.forEach(message => {
                // Obtener datos del autor
                let senderName = 'Usuario';
                let senderInitial = 'U';
                
                const sender = users.find(u => u.id === message.senderId);
                if (sender) {
                    senderName = sender.name;
                    senderInitial = sender.name.charAt(0).toUpperCase();
                }
                
                // Determinar rol del autor
                let roleBadge = '';
                if (group.admins.president === message.senderId) {
                    roleBadge = '<span class="role-badge role-president">Presidente</span>';
                } else if (group.admins.vicePresident === message.senderId) {
                    roleBadge = '<span class="role-badge role-vice-president">Vicepresidente</span>';
                } else if (group.admins.governor === message.senderId) {
                    roleBadge = '<span class="role-badge role-governor">Gobernador</span>';
                }
                
                // Formatear fecha completa
                const messageDate = new Date(message.timestamp);
                const formattedDate = messageDate.toLocaleDateString() + ' ' + 
                                     messageDate.getHours().toString().padStart(2, '0') + ':' + 
                                     messageDate.getMinutes().toString().padStart(2, '0');
                
                // Crear el post
                const postElement = document.createElement('div');
                postElement.classList.add('forum-post');
                
                // Construir contenido según el tipo de mensaje
                let messageContent = '';
                
                if (message.type === 'text') {
                    messageContent = `<div class="post-content">${message.content}</div>`;
                } else if (message.type === 'image') {
                    messageContent = `
                        <div class="post-content">
                            <div class="message-media" data-type="image" data-src="${message.content}">
                                <img src="${message.content}" alt="Imagen">
                            </div>
                        </div>
                    `;
                } else if (message.type === 'video') {
                    messageContent = `
                        <div class="post-content">
                            <div class="message-media" data-type="video" data-src="${message.content}">
                                <video src="${message.content}" controls></video>
                            </div>
                        </div>
                    `;
                } else if (message.type === 'voice') {
                    messageContent = `
                        <div class="post-content">
                            <div class="message-voice">
                                <button class="voice-play-btn">
                                    <i class="fas fa-play"></i>
                                </button>
                                <div class="voice-waveform"></div>
                                <span class="voice-duration">${message.duration || '00:00'}</span>
                                <audio src="${message.content}" class="voice-audio" preload="none"></audio>
                            </div>
                        </div>
                    `;
                }
                
                postElement.innerHTML = `
                    <div class="post-header">
                        <div class="post-author">
                            <div class="post-author-avatar">${senderInitial}</div>
                            <div class="post-author-info">
                                <div class="post-author-name">${senderName} ${roleBadge}</div>
                                <div class="post-date">${formattedDate}</div>
                            </div>
                        </div>
                    </div>
                    ${messageContent}
                    <div class="post-actions">
                        <button class="post-btn post-reply-btn">
                            <i class="fas fa-reply"></i>
                            <span>Responder</span>
                        </button>
                    </div>
                `;
                
                // Añadir eventos para medios
                if (message.type === 'image' || message.type === 'video') {
                    const mediaElement = postElement.querySelector('.message-media');
                    mediaElement.addEventListener('click', () => {
                        showMediaModal(message.type, message.content);
                    });
                } else if (message.type === 'voice') {
                    const playButton = postElement.querySelector('.voice-play-btn');
                    const audio = postElement.querySelector('.voice-audio');
                    
                    playButton.addEventListener('click', () => {
                        if (audio.paused) {
                            // Pausar cualquier otro audio que esté reproduciéndose
                            document.querySelectorAll('.voice-audio').forEach(a => {
                                if (!a.paused && a !== audio) {
                                    a.pause();
                                    a.parentElement.querySelector('.voice-play-btn i').className = 'fas fa-play';
                                }
                            });
                            
                            audio.play();
                            playButton.querySelector('i').className = 'fas fa-pause';
                        } else {
                            audio.pause();
                            playButton.querySelector('i').className = 'fas fa-play';
                        }
                    });
                    
                    // Cambiar ícono cuando termine la reproducción
                    audio.addEventListener('ended', () => {
                        playButton.querySelector('i').className = 'fas fa-play';
                    });
                }
                
                forumContainer.appendChild(postElement);
            });
            
            messagesContainer.appendChild(forumContainer);
        } else {
            // Formato de chat (código original)
            // Renderizar mensajes
            chatMessages.forEach(message => {
                const isOutgoing = message.senderId === currentUser.id;
                const messageElement = document.createElement('div');
                messageElement.classList.add('message');
                messageElement.classList.add(isOutgoing ? 'message-outgoing' : 'message-incoming');
                
                // Obtener nombre del remitente
                let senderName = 'Usuario';
                const sender = users.find(u => u.id === message.senderId);
                if (sender) {
                    senderName = sender.name;
                }
                
                // Determinar rol del autor
                let roleBadge = '';
                if (currentGroupId) {
                    const group = groups.find(g => g.id === currentGroupId);
                    if (group && group.admins) {
                        if (group.admins.president === message.senderId) {
                            roleBadge = '<span class="role-badge role-president">Presidente</span>';
                        } else if (group.admins.vicePresident === message.senderId) {
                            roleBadge = '<span class="role-badge role-vice-president">Vicepresidente</span>';
                        } else if (group.admins.governor === message.senderId) {
                            roleBadge = '<span class="role-badge role-governor">Gobernador</span>';
                        }
                    }
                }
                
                // Formatear fecha
                const messageDate = new Date(message.timestamp);
                const formattedTime = messageDate.getHours().toString().padStart(2, '0') + ':' + 
                                   messageDate.getMinutes().toString().padStart(2, '0');
                
                // Construir contenido según el tipo de mensaje
                let messageContent = '';
                
                if (!isOutgoing) {
                    messageContent += `<div class="message-sender">${senderName} ${roleBadge}</div>`;
                }
                
                if (message.type === 'text') {
                    messageContent += `<div class="message-content">${message.content}</div>`;
                } else if (message.type === 'image') {
                    messageContent += `
                        <div class="message-content">
                            <div class="message-media" data-type="image" data-src="${message.content}">
                                <img src="${message.content}" alt="Imagen">
                            </div>
                        </div>
                    `;
                } else if (message.type === 'video') {
                    messageContent += `
                        <div class="message-content">
                            <div class="message-media" data-type="video" data-src="${message.content}">
                                <video src="${message.content}" controls></video>
                            </div>
                        </div>
                    `;
                } else if (message.type === 'voice') {
                    messageContent += `
                        <div class="message-content">
                            <div class="message-voice">
                                <button class="voice-play-btn">
                                    <i class="fas fa-play"></i>
                                </button>
                                <div class="voice-waveform"></div>
                                <span class="voice-duration">${message.duration || '00:00'}</span>
                                <audio src="${message.content}" class="voice-audio" preload="none"></audio>
                            </div>
                        </div>
                    `;
                }
                
                messageContent += `<div class="message-time">${formattedTime}</div>`;
                
                messageElement.innerHTML = messageContent;
                
                // Añadir eventos para medios
                if (message.type === 'image' || message.type === 'video') {
                    const mediaElement = messageElement.querySelector('.message-media');
                    mediaElement.addEventListener('click', () => {
                        showMediaModal(message.type, message.content);
                    });
                } else if (message.type === 'voice') {
                    const playButton = messageElement.querySelector('.voice-play-btn');
                    const audio = messageElement.querySelector('.voice-audio');
                    
                    playButton.addEventListener('click', () => {
                        if (audio.paused) {
                            // Pausar cualquier otro audio que esté reproduciéndose
                            document.querySelectorAll('.voice-audio').forEach(a => {
                                if (!a.paused && a !== audio) {
                                    a.pause();
                                    a.parentElement.querySelector('.voice-play-btn i').className = 'fas fa-play';
                                }
                            });
                            
                            audio.play();
                            playButton.querySelector('i').className = 'fas fa-pause';
                        } else {
                            audio.pause();
                            playButton.querySelector('i').className = 'fas fa-play';
                        }
                    });
                    
                    // Cambiar ícono cuando termine la reproducción
                    audio.addEventListener('ended', () => {
                        playButton.querySelector('i').className = 'fas fa-play';
                    });
                }
                
                messagesContainer.appendChild(messageElement);
            });
        }
    } else {
        // Formato de chat (para grupos normales y chats privados)
        chatMessages.forEach(message => {
            const isOutgoing = message.senderId === currentUser.id;
            const messageElement = document.createElement('div');
            messageElement.classList.add('message');
            messageElement.classList.add(isOutgoing ? 'message-outgoing' : 'message-incoming');
            
            // Obtener nombre del remitente
            let senderName = 'Usuario';
            const sender = users.find(u => u.id === message.senderId);
            if (sender) {
                senderName = sender.name;
            }
            
            // Determinar rol del autor (solo para grupos)
            let roleBadge = '';
            if (currentGroupId) {
                const group = groups.find(g => g.id === currentGroupId);
                if (group && group.admins) {
                    if (group.admins.president === message.senderId) {
                        roleBadge = '<span class="role-badge role-president">Presidente</span>';
                    } else if (group.admins.vicePresident === message.senderId) {
                        roleBadge = '<span class="role-badge role-vice-president">Vicepresidente</span>';
                    } else if (group.admins.governor === message.senderId) {
                        roleBadge = '<span class="role-badge role-governor">Gobernador</span>';
                    }
                }
            }
            
            // Formatear fecha
            const messageDate = new Date(message.timestamp);
            const formattedTime = messageDate.getHours().toString().padStart(2, '0') + ':' + 
                               messageDate.getMinutes().toString().padStart(2, '0');
            
            // Construir contenido según el tipo de mensaje
            let messageContent = '';
            
            if (!isOutgoing) {
                messageContent += `<div class="message-sender">${senderName} ${roleBadge}</div>`;
            }
            
            if (message.type === 'text') {
                messageContent += `<div class="message-content">${message.content}</div>`;
            } else if (message.type === 'image') {
                messageContent += `
                    <div class="message-content">
                        <div class="message-media" data-type="image" data-src="${message.content}">
                            <img src="${message.content}" alt="Imagen">
                        </div>
                    </div>
                `;
            } else if (message.type === 'video') {
                messageContent += `
                    <div class="message-content">
                        <div class="message-media" data-type="video" data-src="${message.content}">
                            <video src="${message.content}" controls></video>
                        </div>
                    </div>
                `;
            } else if (message.type === 'voice') {
                messageContent += `
                    <div class="message-content">
                        <div class="message-voice">
                            <button class="voice-play-btn">
                                <i class="fas fa-play"></i>
                            </button>
                            <div class="voice-waveform"></div>
                            <span class="voice-duration">${message.duration || '00:00'}</span>
                            <audio src="${message.content}" class="voice-audio" preload="none"></audio>
                        </div>
                    </div>
                `;
            }
            
            messageContent += `<div class="message-time">${formattedTime}</div>`;
            
            messageElement.innerHTML = messageContent;
            
            // Añadir eventos para medios
            if (message.type === 'image' || message.type === 'video') {
                const mediaElement = messageElement.querySelector('.message-media');
                mediaElement.addEventListener('click', () => {
                    showMediaModal(message.type, message.content);
                });
            } else if (message.type === 'voice') {
                const playButton = messageElement.querySelector('.voice-play-btn');
                const audio = messageElement.querySelector('.voice-audio');
                
                playButton.addEventListener('click', () => {
                    if (audio.paused) {
                        // Pausar cualquier otro audio que esté reproduciéndose
                        document.querySelectorAll('.voice-audio').forEach(a => {
                            if (!a.paused && a !== audio) {
                                a.pause();
                                a.parentElement.querySelector('.voice-play-btn i').className = 'fas fa-play';
                            }
                        });
                        
                        audio.play();
                        playButton.querySelector('i').className = 'fas fa-pause';
                    } else {
                        audio.pause();
                        playButton.querySelector('i').className = 'fas fa-play';
                    }
                });
                
                // Cambiar ícono cuando termine la reproducción
                audio.addEventListener('ended', () => {
                    playButton.querySelector('i').className = 'fas fa-play';
                });
            }
            
            messagesContainer.appendChild(messageElement);
        });
    }
    
    // Desplazar al último mensaje
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    // Determinar el ID donde enviar el mensaje (grupo o chat privado)
    const targetId = currentGroupId || currentChatId;
    if (!targetId) return;
    
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    
    if (!messageText) return;
    
    // Crear nuevo mensaje
    const newMessage = {
        id: Date.now().toString(),
        type: 'text',
        content: messageText,
        senderId: currentUser.id,
        timestamp: new Date().toISOString()
    };
    
    // Añadir al array de mensajes correspondiente
    if (!messages[targetId]) {
        messages[targetId] = [];
    }
    
    messages[targetId].push(newMessage);
    
    // Guardar en localStorage
    saveToLocalStorage();
    
    // Limpiar input
    messageInput.value = '';
    
    // Actualizar UI
    loadMessages();
    
    // Actualizar lista de grupos o chats según corresponda
    if (currentGroupId) {
        renderGroups();
    } else {
        renderPrivateChats();
    }
}

// Funcionalidad de adjuntos
function toggleAttachmentOptions() {
    const options = document.getElementById('attachment-options');
    
    // Cerrar emoji picker si está abierto
    document.getElementById('emoji-picker').style.display = 'none';
    
    // Toggle de opciones de adjuntos
    if (options.style.display === 'flex') {
        options.style.display = 'none';
    } else {
        options.style.display = 'flex';
    }
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emoji-picker');
    
    // Cerrar opciones de adjuntos si están abiertas
    document.getElementById('attachment-options').style.display = 'none';
    
    // Toggle de emoji picker
    if (picker.style.display === 'grid') {
        picker.style.display = 'none';
    } else {
        picker.style.display = 'grid';
    }
}

function triggerFileUpload(type) {
    const fileInput = document.getElementById('file-upload');
    
    if (type === 'image') {
        fileInput.accept = 'image/*';
    } else if (type === 'video') {
        fileInput.accept = 'video/*';
    }
    
    fileInput.click();
    toggleAttachmentOptions();
}

function handleFileUpload(e) {
    if (!currentGroupId) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const fileData = event.target.result;
        
        // Determinar tipo de archivo
        let messageType = '';
        if (file.type.startsWith('image/')) {
            messageType = 'image';
        } else if (file.type.startsWith('video/')) {
            messageType = 'video';
        } else {
            alert('Tipo de archivo no soportado');
            return;
        }
        
        // Crear nuevo mensaje
        const newMessage = {
            id: Date.now().toString(),
            type: messageType,
            content: fileData,
            senderId: currentUser.id,
            timestamp: new Date().toISOString()
        };
        
        // Añadir al array de mensajes del grupo
        if (!messages[currentGroupId]) {
            messages[currentGroupId] = [];
        }
        
        messages[currentGroupId].push(newMessage);
        
        // Guardar en localStorage
        saveToLocalStorage();
        
        // Actualizar UI
        loadMessages();
        renderGroups();
    };
    
    reader.readAsDataURL(file);
    
    // Limpiar input
    e.target.value = '';
}

// Funcionalidad de notas de voz
function startVoiceRecording() {
    if (!currentGroupId) return;
    
    // Verificar soporte para grabación
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Tu navegador no soporta la grabación de audio');
        return;
    }
    
    // Mostrar overlay de grabación
    document.getElementById('voice-recorder-overlay').style.display = 'flex';
    
    // Iniciar grabación
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];
            
            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                // Detener el stream
                stream.getTracks().forEach(track => track.stop());
                
                // Procesar audio grabado
                if (recordedChunks.length > 0) {
                    const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
                    const reader = new FileReader();
                    
                    reader.onload = e => {
                        const audioData = e.target.result;
                        
                        // Formatear duración
                        const minutes = Math.floor(recordingDuration / 60);
                        const seconds = recordingDuration % 60;
                        const formattedDuration = 
                            minutes.toString().padStart(2, '0') + ':' + 
                            seconds.toString().padStart(2, '0');
                        
                        // Crear mensaje de voz
                        const voiceMessage = {
                            id: Date.now().toString(),
                            type: 'voice',
                            content: audioData,
                            duration: formattedDuration,
                            senderId: currentUser.id,
                            timestamp: new Date().toISOString()
                        };
                        
                        // Añadir al array de mensajes
                        if (!messages[currentGroupId]) {
                            messages[currentGroupId] = [];
                        }
                        
                        messages[currentGroupId].push(voiceMessage);
                        
                        // Guardar y actualizar UI
                        saveToLocalStorage();
                        loadMessages();
                        renderGroups();
                    };
                    
                    reader.readAsDataURL(audioBlob);
                }
            };
            
            // Iniciar grabación
            mediaRecorder.start();
            
            // Iniciar contador
            recordingDuration = 0;
            document.getElementById('recording-time').textContent = '00:00';
            
            recordingTimer = setInterval(() => {
                recordingDuration++;
                const minutes = Math.floor(recordingDuration / 60);
                const seconds = recordingDuration % 60;
                document.getElementById('recording-time').textContent = 
                    minutes.toString().padStart(2, '0') + ':' + 
                    seconds.toString().padStart(2, '0');
            }, 1000);
            
            // Animación de las barras
            animateRecordingBars();
            
        })
        .catch(err => {
            console.error('Error accessing media devices:', err);
            alert('No se pudo acceder al micrófono');
            document.getElementById('voice-recorder-overlay').style.display = 'none';
        });
}

function animateRecordingBars() {
    const bars = document.querySelectorAll('.voice-animation .bar');
    
    bars.forEach(bar => {
        // Generar altura aleatoria para simular la animación de onda
        const randomHeight = Math.floor(Math.random() * 60) + 20; // Entre 20 y 80px
        bar.style.height = `${randomHeight}px`;
    });
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        requestAnimationFrame(animateRecordingBars);
    }
}

function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        clearInterval(recordingTimer);
        document.getElementById('voice-recorder-overlay').style.display = 'none';
    }
}

function cancelVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        recordedChunks = []; // Descartar audio grabado
        clearInterval(recordingTimer);
        document.getElementById('voice-recorder-overlay').style.display = 'none';
    }
}

// Mostrar medios en modal
function showMediaModal(type, src) {
    const mediaContainer = document.getElementById('media-container');
    mediaContainer.innerHTML = '';
    
    if (type === 'image') {
        const img = document.createElement('img');
        img.src = src;
        mediaContainer.appendChild(img);
    } else if (type === 'video') {
        const video = document.createElement('video');
        video.src = src;
        video.controls = true;
        video.autoplay = true;
        mediaContainer.appendChild(video);
    }
    
    document.getElementById('media-view-modal').style.display = 'flex';
}

// Mostrar información del grupo
function showGroupInfo(groupId) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    // Actualizar la información del grupo en el modal
    document.getElementById('group-name-display').textContent = group.name;
    document.getElementById('group-description-display').textContent = group.description || 'Sin descripción';
    
    // Cargar miembros
    const membersList = document.getElementById('members-list');
    membersList.innerHTML = '';
    
    // Verificar si el usuario actual es el presidente del grupo
    const isPresident = group.admins.president === currentUser.id;
    document.getElementById('admin-options').style.display = isPresident ? 'block' : 'none';
    
    // Obtener usuarios
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    group.members.forEach(memberId => {
        const member = users.find(u => u.id === memberId);
        if (member) {
            const memberItem = document.createElement('div');
            memberItem.classList.add('member-item');
            
            // Crear contenedor para la información del miembro
            const memberInfo = document.createElement('div');
            memberInfo.classList.add('member-info');
            
            // Determinar el rol del miembro
            let roleBadge = '';
            
            if (group.admins.president === memberId) {
                roleBadge = '<span class="role-badge role-president">Presidente</span>';
            } else if (group.admins.vicePresident === memberId) {
                roleBadge = '<span class="role-badge role-vice-president">Vicepresidente</span>';
            } else if (group.admins.governor === memberId) {
                roleBadge = '<span class="role-badge role-governor">Gobernador</span>';
            }
            
            // Añadir nombre del miembro y badge de rol
            memberInfo.innerHTML = `
                <span>${member.name} (${member.email})</span>
                ${roleBadge}
            `;
            
            memberItem.appendChild(memberInfo);
            
            // Añadir botón de eliminar miembro si el usuario actual es presidente
            // No se puede eliminar a los administradores
            const isAdmin = [
                group.admins.president,
                group.admins.vicePresident,
                group.admins.governor
            ].includes(memberId);
            
            if (isPresident && memberId !== currentUser.id && !isAdmin) {
                const actionDiv = document.createElement('div');
                actionDiv.classList.add('member-actions');
                
                const removeBtn = document.createElement('button');
                removeBtn.classList.add('remove-member-btn');
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.setAttribute('data-member-id', memberId);
                removeBtn.setAttribute('data-member-email', member.email);
                removeBtn.onclick = function() {
                    removeMemberFromGroup(groupId, memberId);
                };
                
                actionDiv.appendChild(removeBtn);
                memberItem.appendChild(actionDiv);
            }
            
            membersList.appendChild(memberItem);
        }
    });
    
    // Mostrar el modal
    document.getElementById('group-info-modal').style.display = 'flex';
}

// Eliminar miembro del grupo
function removeMemberFromGroup(groupId, memberId) {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const member = users.find(u => u.id === memberId);
    const memberEmail = member ? member.email : memberId;
    
    if (confirm(`¿Estás seguro de que deseas eliminar a ${memberEmail} del grupo?`)) {
        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
            const memberIndex = groups[groupIndex].members.indexOf(memberId);
            if (memberIndex !== -1) {
                groups[groupIndex].members.splice(memberIndex, 1);
                saveToLocalStorage();
                showGroupInfo(groupId); // Actualizar la vista
                
                // Mostrar notificación
                const toast = document.createElement('div');
                toast.classList.add('toast');
                toast.textContent = `${memberEmail} ha sido eliminado del grupo`;
                document.body.appendChild(toast);
                
                // Eliminar la notificación después de 3 segundos
                setTimeout(() => {
                    toast.remove();
                }, 3000);
            }
        }
    }
}

// Eliminar grupo
function deleteGroup(groupId) {
    if (confirm('¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.')) {
        const groupIndex = groups.findIndex(g => g.id === groupId);
        if (groupIndex !== -1) {
            const groupName = groups[groupIndex].name;
            groups.splice(groupIndex, 1);
            saveToLocalStorage();
            closeModals();
            renderGroups();
            
            // Mostrar notificación
            const toast = document.createElement('div');
            toast.classList.add('toast');
            toast.textContent = `Grupo "${groupName}" eliminado exitosamente`;
            document.body.appendChild(toast);
            
            // Eliminar la notificación después de 3 segundos
            setTimeout(() => {
                toast.remove();
            }, 3000);
            
            // Si el grupo actual era el que se eliminó, limpiar el chat
            if (currentGroupId === groupId) {
                currentGroupId = null;
                updateGroupHeader();
                document.getElementById('messages-container').innerHTML = `
                    <div class="no-group-selected">
                        <i class="fas fa-comments"></i>
                        <p>Selecciona o crea un grupo para comenzar a chatear</p>
                    </div>
                `;
                
                // Desactivar área de entrada de mensajes
                document.getElementById('message-input-area').style.display = 'none';
            }
        }
    }
}

// Añadir miembro al grupo
function addMemberToGroup(groupId, memberEmail) {
    if (!memberEmail || memberEmail.trim() === '') {
        // Mostrar notificación de error
        const toast = document.createElement('div');
        toast.classList.add('toast', 'toast-error');
        toast.textContent = 'Por favor ingresa un email válido';
        document.body.appendChild(toast);
        
        // Eliminar la notificación después de 3 segundos
        setTimeout(() => {
            toast.remove();
        }, 3000);
        return;
    }
    
    // Obtener usuarios
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const member = users.find(u => u.email === memberEmail);
    
    if (!member) {
        // Mostrar notificación de error
        const toast = document.createElement('div');
        toast.classList.add('toast', 'toast-error');
        toast.textContent = 'No se encontró ningún usuario con ese email';
        document.body.appendChild(toast);
        
        // Eliminar la notificación después de 3 segundos
        setTimeout(() => {
            toast.remove();
        }, 3000);
        return;
    }
    
    const groupIndex = groups.findIndex(g => g.id === groupId);
    if (groupIndex !== -1) {
        // Verificar si el miembro ya existe en el grupo
        if (groups[groupIndex].members.includes(member.id)) {
            // Mostrar notificación de error
            const toast = document.createElement('div');
            toast.classList.add('toast', 'toast-error');
            toast.textContent = 'Este usuario ya es miembro del grupo';
            document.body.appendChild(toast);
            
            // Eliminar la notificación después de 3 segundos
            setTimeout(() => {
                toast.remove();
            }, 3000);
            return;
        }
        
        groups[groupIndex].members.push(member.id);
        saveToLocalStorage();
        document.getElementById('member-email').value = ''; // Limpiar el campo
        document.getElementById('add-member-form').style.display = 'none'; // Ocultar el formulario
        showGroupInfo(groupId); // Actualizar la vista
        
        // Mostrar notificación
        const toast = document.createElement('div');
        toast.classList.add('toast');
        toast.textContent = `${member.name} (${member.email}) ha sido añadido al grupo`;
        document.body.appendChild(toast);
        
        // Eliminar la notificación después de 3 segundos
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

function createGroup(e) {
    e.preventDefault();
    
    const groupName = document.getElementById('group-name').value;
    const groupDescription = document.getElementById('group-description').value;
    const groupIcon = document.querySelector('input[name="group-icon"]:checked').value;
    const groupFormat = document.querySelector('input[name="group-format"]:checked').value;
    const vicePresidentEmail = document.getElementById('vice-president-email').value.trim();
    const governorEmail = document.getElementById('governor-email').value.trim();
    
    // Validaciones
    if (!groupName) {
        showToast('Por favor ingresa un nombre para el grupo', true);
        return;
    }
    
    try {
        // Verificar que los emails existan en el sistema
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        let vicePresidentId = null;
        let governorId = null;
        
        if (vicePresidentEmail) {
            const vicePresident = users.find(u => u.email === vicePresidentEmail);
            if (!vicePresident) {
                showToast(`No se encontró un usuario con el email ${vicePresidentEmail}`, true);
                return;
            }
            vicePresidentId = vicePresident.id;
        }
        
        if (governorEmail) {
            const governor = users.find(u => u.email === governorEmail);
            if (!governor) {
                showToast(`No se encontró un usuario con el email ${governorEmail}`, true);
                return;
            }
            governorId = governor.id;
        }
        
        // Crear estructura de roles administrativos
        const admins = {
            president: currentUser.id
        };
        
        if (vicePresidentId) {
            admins.vicePresident = vicePresidentId;
        }
        
        if (governorId) {
            admins.governor = governorId;
        }
        
        // Crear lista de miembros (incluyendo administradores)
        const members = [currentUser.id];
        
        if (vicePresidentId && !members.includes(vicePresidentId)) {
            members.push(vicePresidentId);
        }
        
        if (governorId && !members.includes(governorId)) {
            members.push(governorId);
        }
        
        // Crear nuevo grupo
        const newGroup = {
            id: Date.now().toString(),
            name: groupName,
            description: groupDescription,
            icon: groupIcon,
            format: groupFormat,
            creator: currentUser.id,
            admins: admins,
            members: members,
            createdAt: new Date().toISOString()
        };
        
        // Añadir a la lista de grupos
        groups.push(newGroup);
        
        // Guardar en localStorage
        saveToLocalStorage();
        
        // Actualizar la UI
        renderGroups();
        
        // Seleccionar automáticamente el grupo creado
        selectGroup(newGroup.id);
        
        // Cerrar el modal
        closeModals();
        
        // Limpiar el formulario
        document.getElementById('create-group-form').reset();
        
        // Mostrar toast de éxito
        showToast(`Grupo "${groupName}" creado con éxito`);
    } catch (error) {
        console.error('Error al crear grupo:', error);
        showToast('Ha ocurrido un error al crear el grupo', true);
    }
}

// Función para mostrar mensajes toast de notificación
function showToast(message, isError = false) {
    // Eliminar cualquier toast existente
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Crear el elemento toast
    const toast = document.createElement('div');
    toast.className = isError ? 'toast toast-error' : 'toast';
    toast.textContent = message;
    
    // Añadir al body
    document.body.appendChild(toast);
    
    // Eliminar después de 3 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.remove();
        }
    }, 3000);
}

// Abrir modal para seleccionar miembros
function openSelectMemberModal(role) {
    currentSelectingRole = role;
    const modal = document.getElementById('select-member-modal');
    
    // Cargar lista de usuarios
    loadMembersForSelection();
    
    // Mostrar modal
    modal.style.display = 'flex';
}

// Cargar usuarios para la selección
function loadMembersForSelection() {
    const membersList = document.getElementById('members-selection-list');
    membersList.innerHTML = '';
    
    // Obtener usuarios
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.length === 0) {
        membersList.innerHTML = '<div class="no-members-message">No hay usuarios registrados</div>';
        return;
    }
    
    users.forEach(user => {
        // No mostrar al usuario actual (presidente)
        if (user.id === currentUser.id) return;
        
        const memberItem = document.createElement('div');
        memberItem.classList.add('member-selection-item');
        memberItem.dataset.email = user.email;
        
        // Crear avatar con inicial
        const userInitial = user.name.charAt(0).toUpperCase();
        
        memberItem.innerHTML = `
            <div class="member-selection-avatar">${userInitial}</div>
            <div class="member-selection-info">
                <div class="member-selection-name">${user.name}</div>
                <div class="member-selection-email">${user.email}</div>
            </div>
        `;
        
        // Añadir evento de clic para seleccionar
        memberItem.addEventListener('click', () => {
            selectMemberForRole(user.email);
        });
        
        membersList.appendChild(memberItem);
    });
}

// Seleccionar miembro para un rol
function selectMemberForRole(email) {
    if (currentSelectingRole === 'vice-president') {
        document.getElementById('vice-president-email').value = email;
    } else if (currentSelectingRole === 'governor') {
        document.getElementById('governor-email').value = email;
    }
    
    document.getElementById('select-member-modal').style.display = 'none';
    currentSelectingRole = null;
}

// Filtrar lista de miembros
function filterMembersList() {
    const searchTerm = document.getElementById('search-members').value.toLowerCase();
    const memberItems = document.querySelectorAll('.member-selection-item');
    
    memberItems.forEach(item => {
        const name = item.querySelector('.member-selection-name').textContent.toLowerCase();
        const email = item.querySelector('.member-selection-email').textContent.toLowerCase();
        
        if (name.includes(searchTerm) || email.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Renderizar lista de grupos
function renderGroups() {
    const groupsList = document.getElementById('groups-list');
    groupsList.innerHTML = '';
    
    // Filtrar grupos del usuario actual
    const userGroups = groups.filter(group => group.members.includes(currentUser.id));
    
    if (userGroups.length === 0) {
        const noGroups = document.createElement('div');
        noGroups.classList.add('no-groups');
        noGroups.innerHTML = `
            <p>No tienes grupos todavía</p>
            <p>Crea un grupo usando el botón "+" arriba</p>
        `;
        groupsList.appendChild(noGroups);
        return;
    }
    
    // Ordenar grupos por fecha de creación (más recientes primero)
    userGroups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Renderizar cada grupo
    userGroups.forEach(group => {
        const groupElement = document.createElement('div');
        groupElement.classList.add('group-item');
        groupElement.setAttribute('data-id', group.id);
        
        if (currentGroupId === group.id) {
            groupElement.classList.add('active');
        }
        
        // Obtener último mensaje del grupo si existe
        let lastMessageText = group.description || 'Sin mensajes';
        let lastMessageTime = '';
        
        if (messages[group.id] && messages[group.id].length > 0) {
            const lastMessage = messages[group.id][messages[group.id].length - 1];
            
            if (lastMessage.type === 'text') {
                lastMessageText = lastMessage.content.length > 30 
                    ? lastMessage.content.substring(0, 30) + '...' 
                    : lastMessage.content;
            } else if (lastMessage.type === 'image') {
                lastMessageText = '🖼️ Imagen';
            } else if (lastMessage.type === 'video') {
                lastMessageText = '🎬 Video';
            } else if (lastMessage.type === 'voice') {
                lastMessageText = '🎤 Nota de voz';
            }
            
            // Formatear hora del último mensaje
            const messageDate = new Date(lastMessage.timestamp);
            lastMessageTime = messageDate.getHours().toString().padStart(2, '0') + ':' + 
                          messageDate.getMinutes().toString().padStart(2, '0');
        } else {
            // Si no hay mensajes, mostrar la fecha de creación del grupo
            const createdDate = new Date(group.createdAt);
            lastMessageTime = createdDate.toLocaleDateString();
        }
        
        // Verificar si el usuario es administrador (presidente, vicepresidente o gobernador)
        const isAdmin = group.admins && 
            (group.admins.president === currentUser.id || 
             group.admins.vicePresident === currentUser.id || 
             group.admins.governor === currentUser.id);
        
        // Renderizar elemento de grupo
        groupElement.innerHTML = `
            <div class="group-item-avatar">
                <i class="fas fa-${group.icon || 'users'}"></i>
            </div>
            <div class="group-item-info">
                <div class="group-item-name">
                    ${group.name} 
                    ${isAdmin ? '<span class="admin-badge small">Admin</span>' : ''}
                </div>
                <div class="group-item-last-message">${lastMessageText}</div>
            </div>
            <div class="group-item-meta">
                <div class="group-item-time">${lastMessageTime}</div>
                <div class="group-item-actions">
                    <button class="group-action show-group-info" title="Información del grupo">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    ${group.admins && group.admins.president === currentUser.id ? `
                    <button class="group-action delete-group" title="Eliminar grupo">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        // Añadir evento de clic para seleccionar el grupo
        groupElement.addEventListener('click', (e) => {
            // Si el clic fue en un botón de acción, no seleccionar el grupo
            if (e.target.closest('.group-action')) {
                return;
            }
            selectGroup(group.id);
        });
        
        // Añadir eventos a los botones de acción
        const infoBtn = groupElement.querySelector('.show-group-info');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => {
                showGroupInfo(group.id);
            });
        }
        
        const deleteBtn = groupElement.querySelector('.delete-group');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (confirm('¿Estás seguro de eliminar este grupo?')) {
                    deleteGroup(group.id);
                }
            });
        }
        
        groupsList.appendChild(groupElement);
    });
}

// Aplicar tema dominicano a los elementos de la UI
function applyDominicanTheme() {
    // Aplicar colores a elementos específicos
    document.querySelector('.logo').style.color = '#ce1126'; // Rojo dominicano
    
    // Actualizar colores de los elementos dinámicos
    document.querySelectorAll('.group-item-avatar, .group-avatar, .user-avatar, .post-author-avatar, .member-selection-avatar').forEach(el => {
        el.style.backgroundColor = '#002677'; // Azul dominicano
        el.style.color = '#ffffff';
    });
    
    // Modificar las barras de animación de voz
    document.querySelectorAll('.voice-animation .bar:nth-child(odd)').forEach(el => {
        el.style.backgroundColor = '#002677'; // Azul dominicano
    });
    
    document.querySelectorAll('.voice-animation .bar:nth-child(even)').forEach(el => {
        el.style.backgroundColor = '#ce1126'; // Rojo dominicano
    });
    
    // Actualizar botones primarios
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.style.backgroundColor = '#002677'; // Azul dominicano
    });
    
    // Añadir bandera dominicana en miniatura al pie de la sidebar
    const sidebarFooter = document.createElement('div');
    sidebarFooter.className = 'sidebar-footer';
    sidebarFooter.innerHTML = `
        <div class="flag-container">
            <div class="dr-flag">
                <div class="flag-blue"></div>
                <div class="flag-red"></div>
                <div class="flag-blue" style="top: 60%; left: 60%;"></div>
                <div class="flag-red" style="top: 60%; left: 0;"></div>
            </div>
            <span class="flag-text">República Dominicana</span>
        </div>
    `;
    
    // Agregar al sidebar después de cargar
    setTimeout(() => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.appendChild(sidebarFooter);
        }
    }, 500);
}

// Generar ID único para un chat privado entre dos usuarios
function generatePrivateChatId(userId1, userId2) {
    // Ordenar IDs para asegurar que el mismo par de usuarios siempre tenga el mismo ID de chat
    const sortedIds = [userId1, userId2].sort();
    return `private_${sortedIds[0]}_${sortedIds[1]}`;
}

// Mostrar sección de chats privados
function showPrivateChats() {
    // Activar botón de chats privados
    document.getElementById('private-chats-btn').classList.add('active');
    document.getElementById('group-chats-btn').classList.remove('active');
    
    // Cambiar título de la sección
    document.getElementById('chats-section-title').textContent = 'Conversaciones Privadas';
    
    // Mostrar botón para nuevo chat privado
    document.getElementById('new-private-chat-btn').style.display = 'block';
    document.getElementById('create-group-btn').style.display = 'none';
    
    // Limpiar selección actual
    currentGroupId = null;
    loadMessages();
    
    // Renderizar lista de chats privados
    renderPrivateChats();
}

// Mostrar sección de grupos
function showGroupChats() {
    // Activar botón de grupos
    document.getElementById('group-chats-btn').classList.add('active');
    document.getElementById('private-chats-btn').classList.remove('active');
    
    // Cambiar título de la sección
    document.getElementById('chats-section-title').textContent = 'Grupos';
    
    // Mostrar botón para crear grupo
    document.getElementById('create-group-btn').style.display = 'block';
    document.getElementById('new-private-chat-btn').style.display = 'none';
    
    // Limpiar selección actual
    currentChatId = null;
    loadMessages();
    
    // Renderizar lista de grupos
    renderGroups();
}

// Mostrar modal para iniciar un nuevo chat privado
function showNewChatModal() {
    document.getElementById('new-chat-modal').style.display = 'flex';
    loadUsersForNewChat();
}

// Cargar usuarios para iniciar nuevo chat
function loadUsersForNewChat() {
    const usersList = document.getElementById('users-list');
    usersList.innerHTML = '';
    
    // Obtener usuarios
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-users-message">No hay otros usuarios registrados</div>';
        return;
    }
    
    // Filtrar el usuario actual
    const otherUsers = users.filter(user => user.id !== currentUser.id);
    
    if (otherUsers.length === 0) {
        usersList.innerHTML = '<div class="no-users-message">No hay otros usuarios registrados</div>';
        return;
    }
    
    // Renderizar cada usuario
    otherUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.classList.add('user-selection-item');
        
        const userInitial = user.name.charAt(0).toUpperCase();
        
        userElement.innerHTML = `
            <div class="user-selection-avatar">${userInitial}</div>
            <div class="user-selection-info">
                <div class="user-selection-name">${user.name}</div>
                <div class="user-selection-email">${user.email}</div>
            </div>
        `;
        
        userElement.addEventListener('click', () => {
            startPrivateChat(user.id);
        });
        
        usersList.appendChild(userElement);
    });
}

// Iniciar un chat privado con un usuario
function startPrivateChat(userId) {
    const chatId = generatePrivateChatId(currentUser.id, userId);
    
    // Verificar si ya existe este chat
    if (!privateChats[chatId]) {
        // Obtener datos del otro usuario
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const otherUser = users.find(u => u.id === userId);
        
        if (!otherUser) {
            showToast('No se pudo encontrar al usuario', true);
            return;
        }
        
        // Crear nuevo chat privado
        privateChats[chatId] = {
            id: chatId,
            participants: [currentUser.id, userId],
            participantsInfo: [
                { id: currentUser.id, name: currentUser.name, email: currentUser.email },
                { id: userId, name: otherUser.name, email: otherUser.email }
            ],
            createdAt: new Date().toISOString()
        };
        
        // Crear array de mensajes vacío
        if (!messages[chatId]) {
            messages[chatId] = [];
        }
        
        // Guardar en localStorage
        saveToLocalStorage();
    }
    
    // Cerrar modal
    closeModals();
    
    // Asegurarse de que estamos en la sección de chats privados
    showPrivateChats();
    
    // Seleccionar este chat
    selectPrivateChat(chatId);
}

// Seleccionar un chat privado
function selectPrivateChat(chatId) {
    currentChatId = chatId;
    currentGroupId = null;
    
    // Actualizar UI
    document.querySelectorAll('.chat-item, .group-item').forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedItem = document.querySelector(`.chat-item[data-id="${chatId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('active');
    }
    
    // Actualizar encabezado
    updatePrivateChatHeader(chatId);
    
    // Cargar mensajes
    loadMessages();
    
    // Mostrar área de entrada de mensajes
    document.getElementById('message-input-area').style.display = 'flex';
}

// Actualizar encabezado de chat privado
function updatePrivateChatHeader(chatId) {
    const headerGroupName = document.getElementById('current-group-name');
    const headerGroupMembers = document.getElementById('current-group-members');
    const groupAvatar = document.querySelector('.group-avatar i');
    
    const chat = privateChats[chatId];
    if (!chat) return;
    
    // Encontrar al otro participante
    const otherParticipant = chat.participantsInfo.find(p => p.id !== currentUser.id);
    
    if (otherParticipant) {
        headerGroupName.textContent = otherParticipant.name;
        headerGroupMembers.textContent = 'Chat privado';
        
        // Cambiar icono a usuario individual
        groupAvatar.className = 'fas fa-user';
    } else {
        headerGroupName.textContent = 'Chat privado';
        headerGroupMembers.textContent = '';
        groupAvatar.className = 'fas fa-user';
    }
}

// Renderizar lista de chats privados
function renderPrivateChats() {
    const chatsList = document.getElementById('groups-list'); // Reutilizamos el contenedor
    chatsList.innerHTML = '';
    
    // Obtener chats del usuario actual
    const userChats = Object.values(privateChats).filter(chat => 
        chat.participants.includes(currentUser.id)
    );
    
    if (userChats.length === 0) {
        const noChats = document.createElement('div');
        noChats.classList.add('no-chats');
        noChats.innerHTML = `
            <p>No tienes conversaciones privadas</p>
            <p>Inicia un chat usando el botón "+" arriba</p>
        `;
        chatsList.appendChild(noChats);
        return;
    }
    
    // Ordenar chats por fecha del último mensaje o fecha de creación
    userChats.sort((a, b) => {
        const aMessages = messages[a.id] || [];
        const bMessages = messages[b.id] || [];
        
        const aDate = aMessages.length > 0 
            ? new Date(aMessages[aMessages.length - 1].timestamp) 
            : new Date(a.createdAt);
            
        const bDate = bMessages.length > 0 
            ? new Date(bMessages[bMessages.length - 1].timestamp) 
            : new Date(b.createdAt);
            
        return bDate - aDate; // Más recientes primero
    });
    
    // Renderizar cada chat
    userChats.forEach(chat => {
        const otherParticipant = chat.participantsInfo.find(p => p.id !== currentUser.id);
        if (!otherParticipant) return;
        
        const chatElement = document.createElement('div');
        chatElement.classList.add('chat-item');
        chatElement.setAttribute('data-id', chat.id);
        
        if (currentChatId === chat.id) {
            chatElement.classList.add('active');
        }
        
        // Obtener último mensaje del chat si existe
        let lastMessageText = 'Sin mensajes';
        let lastMessageTime = '';
        
        if (messages[chat.id] && messages[chat.id].length > 0) {
            const lastMessage = messages[chat.id][messages[chat.id].length - 1];
            
            if (lastMessage.type === 'text') {
                lastMessageText = lastMessage.content.length > 30 
                    ? lastMessage.content.substring(0, 30) + '...' 
                    : lastMessage.content;
            } else if (lastMessage.type === 'image') {
                lastMessageText = '🖼️ Imagen';
            } else if (lastMessage.type === 'video') {
                lastMessageText = '🎬 Video';
            } else if (lastMessage.type === 'voice') {
                lastMessageText = '🎤 Nota de voz';
            }
            
            // Formatear hora del último mensaje
            const messageDate = new Date(lastMessage.timestamp);
            lastMessageTime = messageDate.getHours().toString().padStart(2, '0') + ':' + 
                          messageDate.getMinutes().toString().padStart(2, '0');
        } else {
            // Si no hay mensajes, mostrar la fecha de creación del chat
            const createdDate = new Date(chat.createdAt);
            lastMessageTime = createdDate.toLocaleDateString();
        }
        
        // Crear inicial del otro usuario
        const userInitial = otherParticipant.name.charAt(0).toUpperCase();
        
        chatElement.innerHTML = `
            <div class="chat-item-avatar">
                ${userInitial}
            </div>
            <div class="chat-item-info">
                <div class="chat-item-name">${otherParticipant.name}</div>
                <div class="chat-item-last-message">${lastMessageText}</div>
            </div>
            <div class="chat-item-meta">
                <div class="chat-item-time">${lastMessageTime}</div>
                <div class="chat-item-actions">
                    <button class="chat-action delete-chat" title="Eliminar conversación">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Añadir evento de clic para seleccionar el chat
        chatElement.addEventListener('click', (e) => {
            // Si el clic fue en un botón de acción, no seleccionar el chat
            if (e.target.closest('.chat-action')) {
                return;
            }
            selectPrivateChat(chat.id);
        });
        
        // Añadir evento para eliminar conversación
        const deleteBtn = chatElement.querySelector('.delete-chat');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                deletePrivateChat(chat.id);
            });
        }
        
        chatsList.appendChild(chatElement);
    });
}

// Eliminar una conversación privada
function deletePrivateChat(chatId) {
    if (confirm('¿Estás seguro de eliminar esta conversación? Se perderán todos los mensajes.')) {
        // Eliminar chat y mensajes
        delete privateChats[chatId];
        delete messages[chatId];
        
        // Guardar cambios
        saveToLocalStorage();
        
        // Actualizar UI
        renderPrivateChats();
        
        // Si era el chat actual, limpiar área de mensajes
        if (currentChatId === chatId) {
            currentChatId = null;
            document.getElementById('current-group-name').textContent = 'Selecciona una conversación';
            document.getElementById('current-group-members').textContent = '';
            document.getElementById('messages-container').innerHTML = `
                <div class="no-group-selected">
                    <i class="fas fa-comments"></i>
                    <p>Selecciona o inicia una conversación para comenzar a chatear</p>
                </div>
            `;
            
            // Desactivar área de entrada de mensajes
            document.getElementById('message-input-area').style.display = 'none';
        }
        
        // Mostrar notificación
        showToast('Conversación eliminada correctamente');
    }
} 