// ---- Pure math: distributions, descriptive, tests, simplex ----
function lgam(x){const c=[76.18009172947146,-86.50532032941677,24.01409824083091,-1.231739572450155,0.1208650973866179e-2,-0.5395239384953e-5];let y=x,t=x+5.5;t-=(x+.5)*Math.log(t);let s=1.000000000190015;for(const k of c)s+=k/++y;return -t+Math.log(2.5066282746310005*s/x);}
function betacf(a,b,x){const qab=a+b,qap=a+1,qam=a-1,T=1e-30;let c=1,d=1-qab*x/qap;if(Math.abs(d)<T)d=T;d=1/d;let h=d;for(let m=1;m<=300;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<T)d=T;c=1+aa/c;if(Math.abs(c)<T)c=T;d=1/d;h*=d*c;aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<T)d=T;c=1+aa/c;if(Math.abs(c)<T)c=T;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-12)break;}return h;}
function ibeta(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(lgam(a+b)-lgam(a)-lgam(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*betacf(a,b,x)/a:1-bt*betacf(b,a,1-x)/b;}
function erfc(x){const z=Math.abs(x),t=1/(1+.5*z),r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277)))))))));return x>=0?r:2-r;}
const ncdf=z=>0.5*erfc(-z/Math.SQRT2);
const tcdf=(t,v)=>{const p=0.5*ibeta(v/(v+t*t),v/2,.5);return t>0?1-p:p;};
const fsf=(f,d1,d2)=>f<=0?1:ibeta(d2/(d2+d1*f),d2/2,d1/2); // upper-tail P(F>f)
function inv(cdf,p,lo,hi){for(let i=0;i<200;i++){const m=(lo+hi)/2;cdf(m)<p?lo=m:hi=m;}return(lo+hi)/2;}
const tinv=(p,v)=>inv(t=>tcdf(t,v),p,-1e4,1e4), zinv=p=>inv(ncdf,p,-40,40), finv=(a,d1,d2)=>inv(f=>1-fsf(f,d1,d2),1-a,0,1e5);
// p-value & critical value for tail = 'two' | 'greater' | 'less'
function pcrit(s,cdf,iv,tail,al){return tail==='two'?{p:2*(1-cdf(Math.abs(s))),crit:iv(1-al/2)}:tail==='greater'?{p:1-cdf(s),crit:iv(1-al)}:{p:cdf(s),crit:iv(al)};}

function D(a){const n=a.length,s=a.reduce((x,y)=>x+y,0),m=s/n,so=[...a].sort((x,y)=>x-y),v=n>1?a.reduce((x,y)=>x+(y-m)**2,0)/(n-1):NaN,sd=Math.sqrt(v);
 const med=n%2?so[(n-1)/2]:(so[n/2-1]+so[n/2])/2,cnt={};let mode=null,mc=1;a.forEach(x=>{cnt[x]=(cnt[x]||0)+1;if(cnt[x]>mc){mc=cnt[x];mode=x;}});
 const sk=n>2?n/((n-1)*(n-2))*a.reduce((x,y)=>x+((y-m)/sd)**3,0):NaN;
 const ku=n>3?n*(n+1)/((n-1)*(n-2)*(n-3))*a.reduce((x,y)=>x+((y-m)/sd)**4,0)-3*(n-1)**2/((n-2)*(n-3)):NaN;
 return{n,sum:s,mean:m,v,sd,se:sd/Math.sqrt(n),med,mode,sk,ku,min:so[0],max:so[n-1]};}

function ttest(a,b,mode,tail,al,mu0){const A=D(a);let diff,se,df,sdp;
 if(mode==='one'){diff=A.mean-mu0;se=A.sd/Math.sqrt(A.n);df=A.n-1;sdp=A.sd;}
 else{const B=D(b);diff=A.mean-B.mean;
  if(mode==='pooled'){df=A.n+B.n-2;const sp=((A.n-1)*A.v+(B.n-1)*B.v)/df;se=Math.sqrt(sp*(1/A.n+1/B.n));sdp=Math.sqrt(sp);}
  else{const x=A.v/A.n,y=B.v/B.n;se=Math.sqrt(x+y);df=(x+y)**2/(x*x/(A.n-1)+y*y/(B.n-1));sdp=Math.sqrt((A.v+B.v)/2);}}
 const t=diff/se,pc=pcrit(t,x=>tcdf(x,df),q=>tinv(q,df),tail,al),h=tinv(1-al/2,df)*se;
 return{A,B:mode==='one'?null:D(b),diff,se,df,stat:t,...pc,ci:[diff-h,diff+h],d:diff/sdp};}

function anova(groups){const all=groups.flat(),N=all.length,k=groups.length,gm=all.reduce((x,y)=>x+y,0)/N;let ssb=0,ssw=0;const info=groups.map(g=>{const d=D(g);ssb+=d.n*(d.mean-gm)**2;ssw+=g.reduce((x,y)=>x+(y-d.mean)**2,0);return d;});
 const dfb=k-1,dfw=N-k,F=(ssb/dfb)/(ssw/dfw);return{info,ssb,ssw,dfb,dfw,msb:ssb/dfb,msw:ssw/dfw,F,p:fsf(F,dfb,dfw),eta:ssb/(ssb+ssw)};}

function pearson(x,y){const n=x.length,mx=x.reduce((a,b)=>a+b)/n,my=y.reduce((a,b)=>a+b)/n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2;}
 const r=sxy/Math.sqrt(sx*sy),t=r*Math.sqrt((n-2)/(1-r*r));return{n,r,p:Math.abs(r)>=1?0:2*(1-tcdf(Math.abs(t),n-2))};}

// Linear-programming solver (two-phase simplex). x >= 0; ops: '<=','>=','='
function simplex(c,A,ops,b,max){const n=c.length,m=A.length,E=1e-9,cc=max?c:c.map(v=>-v),R=A.map(r=>r.slice()),rh=b.slice(),op=ops.slice();
 for(let i=0;i<m;i++)if(rh[i]<0){R[i]=R[i].map(v=>-v);rh[i]=-rh[i];op[i]=op[i]==='<='?'>=':op[i]==='>='?'<=':'=';}
 const ns=op.filter(o=>o!=='=').length,na=op.filter(o=>o!=='<=').length,N=n+ns+na,T=[],bs=[];let si=n,ai=n+ns;
 for(let i=0;i<m;i++){const w=new Array(N+1).fill(0);for(let j=0;j<n;j++)w[j]=R[i][j];w[N]=rh[i];
  if(op[i]==='<='){w[si]=1;bs.push(si++);}else{if(op[i]==='>=')w[si++]=-1;w[ai]=1;bs.push(ai++);}T.push(w);}
 const piv=(l,e)=>{const p=T[l][e];for(let j=0;j<=N;j++)T[l][j]/=p;for(let i=0;i<m;i++)if(i!==l){const g=T[i][e];if(g)for(let j=0;j<=N;j++)T[i][j]-=g*T[l][j];}bs[l]=e;};
 const run=(cost,lim)=>{for(let it=0;it<5000;it++){let e=-1;
  for(let j=0;j<lim&&e<0;j++){if(bs.includes(j))continue;let r=cost[j];for(let i=0;i<m;i++)r-=cost[bs[i]]*T[i][j];if(r>E)e=j;}
  if(e<0)return'optimal';let l=-1,best=Infinity;
  for(let i=0;i<m;i++)if(T[i][e]>E){const q=T[i][N]/T[i][e];if(q<best-E||(Math.abs(q-best)<=E&&bs[i]<bs[l])){best=q;l=i;}}
  if(l<0)return'unbounded';piv(l,e);}return'limit';};
 if(na){const c1=new Array(N).fill(0);for(let j=n+ns;j<N;j++)c1[j]=-1;run(c1,N);let s=0;for(let i=0;i<m;i++)if(bs[i]>=n+ns)s+=T[i][N];if(s>1e-7)return{status:'infeasible'};
  for(let i=0;i<m;i++)if(bs[i]>=n+ns){const j=T[i].slice(0,n+ns).findIndex(v=>Math.abs(v)>E);if(j>=0)piv(i,j);}}
 const c2=new Array(N).fill(0);for(let j=0;j<n;j++)c2[j]=cc[j];const st=run(c2,n+ns);if(st!=='optimal')return{status:st};
 const x=new Array(n).fill(0);for(let i=0;i<m;i++)if(bs[i]<n)x[bs[i]]=T[i][N];
 return{status:'optimal',x,obj:c.reduce((s,v,j)=>s+v*x[j],0)};}
