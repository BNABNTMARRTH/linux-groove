// Regression for the std::locale/iostream crash found during UTM acceptance.
#include <fstream>
#include <sstream>
#include <iostream>
#include <locale>
#include <string>
#include <mutex>
int main(int argc,char** argv) {
    if(argc!=2)return 1;
    std::once_flag once;
    std::call_once(once, [] {});
    std::ifstream input(argv[1]);
    input.imbue(std::locale::classic());
    std::string line;
    if(!std::getline(input,line)||line.empty())return 2;
    std::istringstream stream(line);
    std::string first;stream>>first;
    if(first.empty())return 3;
    std::cout<<"C++ locale and file I/O work inside LFS runtime\n";
}
