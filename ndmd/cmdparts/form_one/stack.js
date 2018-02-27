export const template = {
    name: "stack",
    dict:
        {
            id: null,
            Count: -1
        }
}


export const inject =
    [
        {   
            name:"type",
            key:"id",
        },
        {
            name:"count",
            key:"Count"
        }
    ]
        