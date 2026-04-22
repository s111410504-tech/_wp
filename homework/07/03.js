const posts = [
    { id: 1, t: "A" },
    { id: 2, t: "B" }
];

let html = "";

// 使用 forEach 遍歷並拼接字串
posts.forEach(post => {
    html += `<div>${post.t}</div>`;
});

console.log(html); 
// 輸出: <div>A</div><div>B</div>