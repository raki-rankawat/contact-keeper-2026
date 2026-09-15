import { useRef } from 'react'
import { CSSTransition } from 'react-transition-group'
import ContactItem from './ContactItem'

const AnimatedContact = ({ contact, ...transitionProps }) => {
  const nodeRef = useRef(null)

  return (
    <CSSTransition
      {...transitionProps}
      nodeRef={nodeRef}
      timeout={500}
      classNames='item'
    >
      <ContactItem ref={nodeRef} contact={contact} />
    </CSSTransition>
  )
}

export default AnimatedContact
