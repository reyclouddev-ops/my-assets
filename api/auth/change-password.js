const { MongoClient } = require("mongodb");
const crypto = require("crypto");

const client = new MongoClient(process.env.MONGODB_URI);

function hashPassword(password){
return crypto
.createHash("sha256")
.update(password)
.digest("hex");
}

module.exports=async function(req,res){

if(req.method!=="POST"){
return res.status(405).json({
success:false,
error:"Method tidak diizinkan."
});
}

try{

const {
username,
currentPassword,
newPassword
}=req.body||{};

if(!username||!currentPassword||!newPassword){
return res.status(400).json({
success:false,
error:"Data tidak lengkap."
});
}

if(newPassword.length<8){
return res.status(400).json({
success:false,
error:"Password baru minimal 8 karakter."
});
}

if(currentPassword===newPassword){
return res.status(400).json({
success:false,
error:"Password baru harus berbeda."
});
}

await client.connect();

const db=client.db(
process.env.MONGODB_DB||"reycloudshop"
);

const users=db.collection("users");

const user=await users.findOne({
username:String(username).trim()
});

if(!user){
return res.status(404).json({
success:false,
error:"User tidak ditemukan."
});
}

const currentHash=hashPassword(currentPassword);

if(user.password!==currentHash){
return res.status(401).json({
success:false,
error:"Password saat ini salah."
});
}

const newHash=hashPassword(newPassword);

await users.updateOne(
{
_id:user._id
},
{
$set:{
password:newHash,
updatedAt:new Date()
}
}
);

return res.status(200).json({
success:true,
message:"Password berhasil diperbarui."
});

}catch(error){

console.error("[CHANGE PASSWORD]",error);

return res.status(500).json({
success:false,
error:"Terjadi kesalahan server."
});

}finally{

try{
await client.close();
}catch{}

}

};
