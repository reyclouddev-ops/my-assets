const { MongoClient } = require("mongodb")

let clientPromise

function getClient(){
  if(!process.env.MONGODB_URI){
    throw new Error(
      "MONGODB_URI belum dikonfigurasi."
    )
  }

  if(!clientPromise){
    const client=new MongoClient(
      process.env.MONGODB_URI
    )

    clientPromise=client.connect()
  }

  return clientPromise
}

module.exports=async function(req,res){

  if(req.method!=="GET"){
    return res.status(405).json({
      success:false,
      error:"Method tidak diizinkan."
    })
  }

  try{

    if(!process.env.MONGODB_DB){
      throw new Error(
        "MONGODB_DB belum dikonfigurasi."
      )
    }

    const client=
      await getClient()

    const db=
      client.db(
        process.env.MONGODB_DB
      )

    const activities=
      await db
        .collection("activities")
        .find({})
        .sort({
          createdAt:-1,
          _id:-1
        })
        .limit(50)
        .toArray()

    return res.status(200).json({

      success:true,

      database:process.env.MONGODB_DB,

      activities:
        activities.map(item=>({

          id:String(item._id),

          type:
            typeof item.type==="string"
            ?item.type
            :"update",

          title:
            typeof item.title==="string"
            ?item.title
            :"Update",

          description:
            typeof item.description==="string"
            ?item.description
            :"",

          version:
            typeof item.version==="string"
            ?item.version
            :"",

          date:
            typeof item.date==="string"
            ?item.date
            :"",

          time:
            typeof item.time==="string"
            ?item.time
            :"",

          createdAt:
            item.createdAt
            ?new Date(item.createdAt).toISOString()
            :null

        }))

    })

  }catch(error){

    console.error(
      "[ACTIVITY]",
      error
    )

    return res.status(500).json({

      success:false,

      error:
        "Gagal mengambil activity."

    })

  }

}
