from api.db.session import SessionLocal
from api.db.kb_models import KBDoc

docs = [
  KBDoc(
    title="E42 Audio dropout troubleshooting",
    source="internal-runbook",
    content="E42 commonly occurs with loose audio connectors, DSP buffer underruns, or network jitter. Verify cable integrity, check DSP logs, and isolate network path."
  ),
  KBDoc(
    title="High packet loss mitigation",
    source="internal-runbook",
    content="If packet loss > 5%, run ping/jitter tests, check switch ports, replace cable, confirm QoS, and look for duplex mismatch."
  ),
  KBDoc(
    title="Overtemperature response",
    source="internal-runbook",
    content="If temperature > 70C, ensure ventilation, check fan status, reduce load, and inspect for dust blockage."
  ),
]

db = SessionLocal()
db.add_all(docs)
db.commit()
db.close()
print("Seeded KB")
