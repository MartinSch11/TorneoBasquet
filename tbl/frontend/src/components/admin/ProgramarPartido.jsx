import ModalProgramarPartido from './ModalProgramarPartido'

export default function ProgramarPartido(props) {
  return <ModalProgramarPartido isOpen={props.isOpen ?? true} {...props} />
}
