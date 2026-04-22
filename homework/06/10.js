function calculateTotal(cart, discountFunc) {
    const sum = cart.reduce((total, price) => total + price, 0);
    return discountFunc(sum);
}

const cart = [100, 200, 300];

const finalPrice = calculateTotal(cart, (total) => total - 50);

console.log(`最終金額為：${finalPrice}`); // 輸出: 最終金額為：550