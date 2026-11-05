#!/usr/bin/env python3
"""Local Unix serial console for repeatable VM acceptance and PNG retrieval."""
import argparse
import base64
from pathlib import Path
import re
import shlex
import socket
import time


def exchange(path, command, timeout, complete=None):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as sock:
        sock.settimeout(5)
        sock.connect(path)
        sock.sendall((command+'\n').encode())
        sock.settimeout(0.25)
        end=time.monotonic()+timeout
        data=bytearray()
        while time.monotonic()<end:
            try:
                chunk=sock.recv(65536)
                if not chunk:break
                data.extend(chunk)
                if len(data)>32*1024*1024:raise ValueError('Serial response exceeded 32 MiB')
                if complete and complete.search(data):break
            except TimeoutError:
                pass
        return bytes(data)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('socket')
    parser.add_argument('--timeout',type=float,default=3)
    sub=parser.add_subparsers(dest='action',required=True)
    send=sub.add_parser('send');send.add_argument('command')
    receive=sub.add_parser('receive');receive.add_argument('guest_file');receive.add_argument('output',type=Path)
    args=parser.parse_args()
    if args.action=='send':
        print(exchange(args.socket,args.command,args.timeout).decode(errors='replace'))
        return
    marker=re.compile(rb'\r*\nGROOVE_FILE_END\r*\n')
    command="printf '\\nGROOVE_FILE_BEGIN\\n'; base64 "+shlex.quote(args.guest_file)+"; printf '\\nGROOVE_FILE_END\\n'"
    data=exchange(args.socket,command,args.timeout,marker)
    match=re.search(rb'GROOVE_FILE_BEGIN\r*\n(.*?)\r*\nGROOVE_FILE_END\r*\n',data,re.S)
    if not match:raise SystemExit('Incomplete serial file transfer')
    decoded=base64.b64decode(re.sub(rb'\s+',b'',match[1]),validate=True)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_bytes(decoded)
    print(f'Received {len(decoded)} bytes: {args.output}')

if __name__=='__main__':main()
