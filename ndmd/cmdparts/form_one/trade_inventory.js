export const template = {
    name: "trade_inventory",
    dict: {
        Recipes: null
    }
}

export const inject = [
    {
        name:"trades",
        type:"list",
        key:"Recipes",
        item_type:"trade"
        
    }
    ];