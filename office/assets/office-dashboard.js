(() => {
  const SUPABASE_URL="https://idurlccrarznnnqixxsd.supabase.co";
  const SUPABASE_KEY="sb_publishable_JIRAAdzm97xMNN1jIS_idg_oHEObFhT";
  const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const status=document.getElementById("dashboard-status");
  const showError=message=>{status.textContent=message;status.className="status";};
  async function guard(){
    const {data:{session},error}=await client.auth.getSession();
    if(error||!session){location.replace("./login.html");return;}
    const {data:assurance,error:assuranceError}=await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if(assuranceError||assurance?.currentLevel!=="aal2"){location.replace("./login.html");return;}
    const response=await fetch(SUPABASE_URL+"/functions/v1/office-auth-check",{method:"POST",headers:{"Authorization":"Bearer "+session.access_token,"apikey":SUPABASE_KEY,"Content-Type":"application/json"},body:"{}"});
    const result=await response.json().catch(()=>({}));
    if(!response.ok||result.ok!==true){await client.auth.signOut();location.replace("./login.html");return;}
    status.textContent="Secure owner session verified.";
    status.className="status success";
  }
  document.getElementById("logout-btn").addEventListener("click",async()=>{
    const button=document.getElementById("logout-btn");button.disabled=true;
    await client.auth.signOut();location.replace("./login.html");
  });
  guard().catch(()=>{showError("Unable to verify Office access. Please sign in again.");setTimeout(()=>location.replace("./login.html"),900);});
})();