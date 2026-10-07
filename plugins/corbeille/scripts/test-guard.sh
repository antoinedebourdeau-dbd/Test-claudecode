#!/usr/bin/env bash
# Tests du garde-fou : ./test-guard.sh  (requiert jq)
cd -- "$(dirname -- "$0")" || exit 1
fail=0
check() {
  local want="$1" cmd="$2" got=permis
  jq -n --arg c "$cmd" '{tool_input:{command:$c}}' | ./guard.sh 2>/dev/null | grep -q deny && got=bloque
  if [ "$got" = "$want" ]; then echo "ok    $got  | ${cmd//$'\n'/⏎}"; else echo "ÉCHEC $got  | ${cmd//$'\n'/⏎}"; fail=1; fi
}
check bloque 'rm -rf build'
check bloque 'ls && rm x'
check bloque 'sudo rm a'
check bloque '\rm a'
check bloque '/bin/rm a'
check bloque '(cd x; rm y)'
check bloque 'rmdir d'
check bloque 'unlink f'
check bloque 'xargs rm < l'
check bloque 'ls | xargs -0 rm'
check bloque 'find . -name "*.o" -delete'
check bloque 'find . -exec rm {} \;'
check bloque 'git clean -fd'
check bloque $'cat > f <<EOF\nrm x\nEOF\nrm -rf y'
check bloque $'bash <<EOF\nrm -rf z\nEOF'
check permis $'git commit -F - <<\'EOF\'\nblocks xargs rm and rm -rf\nEOF\ngit push'
check permis $'cat <<-EOF\n\trm a\n\tEOF'
check permis 'ls -la'
check permis 'git rm --cached f'
check permis 'git clean -n'
check permis 'git clean -nd'
check permis 'npm run rm-cache'
check permis 'cat firm.txt'
check permis 'mv a b'
check permis 'echo xargs format'
exit "$fail"
