# Viwai · proyección orgánico vs publicidad (9 nov 2026). Estimaciones, no datos: cambiar los supuestos cuando haya usuarias reales.
# Supuestos: margen por casa activa al mes (tras reembolsos), casas nuevas orgánicas al mes al inicio (+4 %/mes), 3 % de invitaciones al mes,
# 4 % de bajas al mes, comisiones cobradas 2 meses después, cuota 80 € el 1.er año y 300 € después, 30 € de gastos fijos, marca 150 €/12,
# publicidad desde 3 meses seguidos cubriendo gastos, con el 50 % de lo que sobra tras apartar 30 % (IRPF y colchón); neto = 80 % del beneficio.
# Uso: python3 tools/proyeccion.py
import json
MESES=["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"]
def lab(i): # i=0 -> dic 2026
    m=(11+i)%12; y=2026+(11+i)//12; return f"{MESES[m]} {y}"
def sim(margen_casa, base_new, cac, ads, reinv=0.5, n=72, crec=0.04, ref=0.03, churn=0.04):
    act=0; hist=[]; res=[]; ads_on=False; streak=0; nuevos_base=base_new
    for i in range(n):
        cuota = 80 if i<12 else 300   # tarifa plana el primer año (alta en dic 2026)
        fijos = 30 + cuota + 150/12
        # ingresos con 2 meses de retraso
        margen = hist[i-2]*margen_casa if i>=2 else 0
        exced = margen - fijos
        presupuesto = 0
        if ads and ads_on and exced>0: presupuesto = exced*0.7*reinv   # 30% IRPF+colchón apartado
        neto = max(0,exced - presupuesto)*0.8 if exced>0 else exced  # 20% IRPF
        if exced>=0: streak+=1
        else: streak=0
        if streak>=3: ads_on=True
        nuevos = nuevos_base + ref*act + (presupuesto/cac if presupuesto>0 else 0)
        nuevos_base*= (1+crec)
        act = act*(1-churn) + nuevos
        hist.append(act)
        res.append(dict(mes=lab(i),activas=round(act),margen=round(margen),neto=round(neto),ads=round(presupuesto)))
    return res
def cuando(r,obj):
    for x in r:
        if x["neto"]>=obj: return x["mes"]
    return "más de 6 años"
esc={"Prudente":(1.5,20,25),"Central":(2.0,30,15),"Optimista":(3.0,50,10)}
out={}
for k,(mc,bn,cac) in esc.items():
    o=sim(mc,bn,cac,False); a=sim(mc,bn,cac,True)
    out[k]=dict(org=o,ads=a)
    print(k, "orgánico 1500:",cuando(o,1500),"4000:",cuando(o,4000),"| publicidad 1500:",cuando(a,1500),"4000:",cuando(a,4000),
      "| ads empiezan", next((x["mes"] for x in a if x["ads"]>0),"-"), "| casas a 24m org/ads", o[23]["activas"], a[23]["activas"])

