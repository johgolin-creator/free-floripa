import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listConfirmedInviteMembers, type ConfirmedInviteMember } from "../../lib/scheduleInvites";

/** Quem confirmou pelo link, agrupado por escala. Atualiza sozinho (a cada 20 s, com a aba
 *  visível) e sob demanda com refresh(), para a equipe acompanhar desistências e remoções. */
export function useInviteTeams(pollMs = 20_000) {
  const [members, setMembers] = useState<ConfirmedInviteMember[]>([]);
  const lastJson = useRef("");

  const refresh = useCallback(() => {
    listConfirmedInviteMembers()
      .then((rows) => {
        // Só troca o estado se mudou: evita redesenhar a página inteira a cada consulta.
        const json = JSON.stringify(rows);
        if (json === lastJson.current) return;
        lastJson.current = json;
        setMembers(rows);
      })
      .catch(() => {
        // Sem conexão ou convite ainda não ativado no banco: a escala segue só com os nomes digitados.
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState !== "hidden") refresh();
    }, pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  const bySchedule = useMemo(() => {
    const map = new Map<string, ConfirmedInviteMember[]>();
    for (const member of members) {
      const list = map.get(member.scheduleId);
      if (list) list.push(member);
      else map.set(member.scheduleId, [member]);
    }
    return map;
  }, [members]);

  return { bySchedule, refresh };
}
