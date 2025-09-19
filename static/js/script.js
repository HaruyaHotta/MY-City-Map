let map;
let markers = [];
let allPostsData = []; 

function initMap() {
    const mapOptions = {
        center: { lat: 35.17, lng: 136.73 },
        zoom: 13.3,
    };
    map = new google.maps.Map(document.getElementById("map"), mapOptions);

    fetchAndAddMarkers();

    map.addListener("click", (event) => {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();

        const infoWindow = new google.maps.InfoWindow({
            content: `
                <h3>投稿フォーム</h3>
                <form id="post-form">
                    <label for="title">場所の名前:</label><br>
                    <input type="text" id="title" name="title"><br><br>
                    <label for="comment">コメント:</label><br>
                    <textarea id="comment" name="comment"></textarea><br><br>
                    <label for="category">カテゴリ:</label><br>
                    <select id="category" name="category">
                        <option value="default">選択してください</option>
                        <option value="restaurant">飲食店</option>
                        <option value="cafe">カフェ</option>
                        <option value="sightseeing">観光スポット</option>
                        <option value="park">公園</option>
                        <option value="danger">危ない場所</option>
                    </select><br><br>
                    <button type="submit">投稿</button>
                </form>
            `,
            position: event.latLng,
        });
        infoWindow.open(map);

        google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
            const form = document.getElementById('post-form');
            if (form) {
                form.addEventListener('submit', function(e) {
                    e.preventDefault();
                    const title = document.getElementById('title').value;
                    const comment = document.getElementById('comment').value;
                    const category = document.getElementById('category').value;

                    const postData = {
                        title: title,
                        comment: comment,
                        category: category,
                        latitude: lat,
                        longitude: lng,
                    };

                    fetch('/api/posts', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(postData),
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log('Success:', data);
                        infoWindow.close();
                        alert('投稿が完了しました！');
                        fetchAndAddMarkers();
                    })
                    .catch((error) => console.error('Error:', error));
                });
            }
        });
    });

    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            filterPostsByCategory(e.target.value);
        });
    }
}

function fetchAndAddMarkers() {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];

    fetch('/api/posts')
        .then(response => response.json())
        .then(data => {
            allPostsData = data.posts;
            const categoryFilter = document.getElementById('category-filter');
            const selectedCategory = categoryFilter ? categoryFilter.value : 'all';
            filterPostsByCategory(selectedCategory);
        })
        .catch(error => console.error('Error fetching posts:', error));
}

function filterPostsByCategory(category) {
    for (let i = 0; i < markers.length; i++) {
        markers[i].setMap(null);
    }
    markers = [];

    const postsList = document.getElementById('posts-list');
    if (postsList) {
        postsList.innerHTML = ''; 
    }

    const filteredPosts = category === 'all' 
        ? allPostsData 
        : allPostsData.filter(post => post.category === category);

    filteredPosts.forEach(post => {
        const { pinColor, pinLabel } = getPinStyle(post.category);

        const marker = new google.maps.Marker({
            position: { lat: post.latitude, lng: post.longitude },
            map: map,
            title: post.title,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: pinColor,
                fillOpacity: 0.9,
                strokeWeight: 1,
                strokeColor: '#FFFFFF'
            },
            label: {
                text: pinLabel,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '12px'
            }
        });
        markers.push(marker);

        const infoWindow = new google.maps.InfoWindow({
            content: `<h3>${post.title}</h3><p>${post.comment}</p><button class="edit-button" data-post-id="${post.id}" data-post-title="${post.title}" data-post-comment="${post.comment}" data-post-category="${post.category}">編集</button><button class="delete-button" data-post-id="${post.id}">削除</button>`
        });

        marker.addListener("click", () => {
            infoWindow.open(map, marker);

            google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
                const deleteButton = document.querySelector('.delete-button[data-post-id="' + post.id + '"]');
                if (deleteButton) {
                    deleteButton.addEventListener('click', () => {
                        if (confirm('この投稿を削除してもよろしいですか？')) {
                            const postId = deleteButton.getAttribute('data-post-id');
                            fetch(`/api/posts/${postId}`, { method: 'DELETE' })
                                .then(response => {
                                    if (response.ok) {
                                        infoWindow.close();
                                        alert('投稿が削除されました');
                                        fetchAndAddMarkers();
                                    } else {
                                        alert('削除に失敗しました');
                                    }
                                })
                                .catch(error => console.error('Error:', error));
                        }
                    });
                }

                const editButton = document.querySelector('.edit-button[data-post-id="' + post.id + '"]');
                if (editButton) {
                    editButton.addEventListener('click', () => {
                        const editFormContent = `
                            <h3>投稿を編集</h3>
                            <form id="edit-post-form">
                                <label for="edit-title">場所の名前:</label><br>
                                <input type="text" id="edit-title" name="title" value="${post.title}"><br><br>
                                <label for="edit-comment">コメント:</label><br>
                                <textarea id="edit-comment" name="comment">${post.comment}</textarea><br><br>
                                <label for="edit-category">カテゴリ:</label><br>
                                <select id="edit-category" name="category">
                                    <option value="restaurant" ${post.category === 'restaurant' ? 'selected' : ''}>飲食店</option>
                                    <option value="cafe" ${post.category === 'cafe' ? 'selected' : ''}>カフェ</option>
                                    <option value="sightseeing" ${post.category === 'sightseeing' ? 'selected' : ''}>観光スポット</option>
                                    <option value="park" ${post.category === 'park' ? 'selected' : ''}>公園</option>
                                    <option value="danger" ${post.category === 'danger' ? 'selected' : ''}>危ない場所</option>
                                </select><br><br>
                                <button type="submit">更新</button>
                            </form>
                        `;
                        infoWindow.setContent(editFormContent);

                        const editForm = document.getElementById('edit-post-form');
                        if (editForm) {
                            editForm.addEventListener('submit', function(e) {
                                e.preventDefault();
                                const newTitle = document.getElementById('edit-title').value;
                                const newComment = document.getElementById('edit-comment').value;
                                const newCategory = document.getElementById('edit-category').value;
                                const updatedData = { title: newTitle, comment: newComment, category: newCategory };

                                fetch(`/api/posts/${post.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(updatedData),
                                })
                                .then(response => {
                                    if (response.ok) {
                                        infoWindow.close();
                                        alert('投稿が更新されました！');
                                        fetchAndAddMarkers();
                                    } else {
                                        alert('更新に失敗しました');
                                    }
                                })
                                .catch(error => console.error('Error:', error));
                            });
                        }
                    });
                }
            });
        });
        
        if (postsList) {
            const listItem = document.createElement('li');
            listItem.className = 'post-item';
            listItem.innerHTML = `
                <div class="post-header">
                    <span class="post-category-icon">${pinLabel}</span>
                    <h4 class="post-title">${post.title}</h4>
                </div>
                <p class="post-comment">${post.comment}</p>
            `;
            postsList.appendChild(listItem);

            listItem.addEventListener('click', () => {
                map.panTo(marker.getPosition());
                infoWindow.open(map, marker);
            });
        }
    });
}

function getPinStyle(category) {
    let pinColor;
    let pinLabel;
    switch (category) {
        case 'restaurant':
            pinColor = '#FF5733';
            pinLabel = '🍽️';
            break;
        case 'cafe':
            pinColor = '#FFC300';
            pinLabel = '☕';
            break;
        case 'sightseeing':
            pinColor = '#33C4FF';
            pinLabel = '🗼';
            break;
        case 'park':
            pinColor = '#7CFC00';
            pinLabel = '🌳';
            break;
        case 'danger':
            pinColor = '#FF0000';
            pinLabel = '⚠️';
            break;
        default:
            pinColor = '#808080';
            pinLabel = '📍';
    }
    return { pinColor, pinLabel };
}
