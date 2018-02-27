export const template = {
    name: "trade",
    dict: {
                buy: null,
                maxUses: 9999999,
                sell: null,
                rewardExp: false
    }
}
export const inject = [
    {   name:"price_stack",
        type:"stack",
        key:"buy",
    },
    {
        name:"product_stack",
        type:"stack",
        key:"sell"
    }
];

    